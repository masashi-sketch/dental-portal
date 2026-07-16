// @vitest-environment node
// APIルートハンドラを直接呼び出すテスト。@/authと@/lib/supabase/serverをモックし、
// isPatientInScopeによるテナント分離と、clinicロールのcustomerCode付け替え防止を検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

type ScopeRow = { customer_code: string } | null;
let scopeRow: ScopeRow = null;
const updateSpy = vi.fn();
const deleteSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: scopeRow }),
          single: async () => ({ data: { id: 'patient-1', ...scopeRow }, error: null }),
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        updateSpy(patch);
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'patient-1', ...patch }, error: null }),
            }),
          }),
        };
      },
      delete: () => {
        deleteSpy();
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

const { GET, PATCH, DELETE } = await import('./route');

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/patients/patient-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 'patient-1' });

describe('GET/PATCH/DELETE /api/admin/patients/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    scopeRow = null;
    updateSpy.mockReset();
    deleteSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const getRes = await GET(new NextRequest('http://localhost/api/admin/patients/patient-1'), { params });
    expect(getRes.status).toBe(401);
    const patchRes = await PATCH(patchRequest({ name: 'x' }), { params });
    expect(patchRes.status).toBe(401);
    const deleteRes = await DELETE(new NextRequest('http://localhost/api/admin/patients/patient-1'), { params });
    expect(deleteRes.status).toBe(401);
  });

  it('clinicロールが他院の患者にアクセスすると404になり、更新・削除は実行されない', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A999999' };

    const getRes = await GET(new NextRequest('http://localhost/api/admin/patients/patient-1'), { params });
    expect(getRes.status).toBe(404);

    const patchRes = await PATCH(patchRequest({ name: 'x' }), { params });
    expect(patchRes.status).toBe(404);
    expect(updateSpy).not.toHaveBeenCalled();

    const deleteRes = await DELETE(new NextRequest('http://localhost/api/admin/patients/patient-1'), { params });
    expect(deleteRes.status).toBe(404);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('clinicロールが自院の患者を更新する際、customerCodeの変更は無視される', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A000001' };

    const res = await PATCH(patchRequest({ customerCode: 'A999999', name: '山田太郎' }), { params });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ name: '山田太郎' }));
    expect(updateSpy.mock.calls[0][0]).not.toHaveProperty('customer_code');
  });

  it('bgjロールが更新する際はcustomerCodeの変更も反映される', async () => {
    sessionValue = makeSession({ role: 'bgj' });
    scopeRow = { customer_code: 'A999999' };

    const res = await PATCH(patchRequest({ customerCode: 'A000002', name: '山田太郎' }), { params });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ customer_code: 'A000002' }));
  });

  it('自院の患者ならGET・DELETEも成功する', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A000001' };

    const getRes = await GET(new NextRequest('http://localhost/api/admin/patients/patient-1'), { params });
    expect(getRes.status).toBe(200);

    const deleteRes = await DELETE(new NextRequest('http://localhost/api/admin/patients/patient-1'), { params });
    expect(deleteRes.status).toBe(200);
    expect(deleteSpy).toHaveBeenCalled();
  });
});
