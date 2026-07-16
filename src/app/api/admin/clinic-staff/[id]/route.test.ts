// @vitest-environment node
// APIルートハンドラを直接呼び出すテストの雛形。@/authと@/lib/supabase/serverをモックし、
// isClinicResourceInScopeによるテナント分離がルートレベルで実効しているかを検証する。
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
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        updateSpy(patch);
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'staff-1', ...patch }, error: null }),
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

const { PATCH, DELETE } = await import('./route');

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/clinic-staff/staff-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 'staff-1' });

describe('PATCH/DELETE /api/admin/clinic-staff/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    scopeRow = null;
    updateSpy.mockReset();
    deleteSpy.mockReset();
  });

  it('未認証なら401（更新処理は実行しない）', async () => {
    const res = await PATCH(patchRequest({ name: 'x' }), { params });
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('clinicロールが他院のスタッフ行を更新しようとすると404になり、更新は実行されない', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A999999' };
    const res = await PATCH(patchRequest({ name: 'x' }), { params });
    expect(res.status).toBe(404);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('clinicロールが他院のスタッフ行を削除しようとすると404になり、削除は実行されない', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A999999' };
    const res = await DELETE(new NextRequest('http://localhost/api/admin/clinic-staff/staff-1'), { params });
    expect(res.status).toBe(404);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('clinicロールが自院のスタッフ行を更新すると成功する', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A000001' };
    const res = await PATCH(patchRequest({ name: '山田太郎' }), { params });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ name: '山田太郎' }));
  });

  it('bgjロールはcustomer_codeが一致しなくてもスコープチェックを通過する', async () => {
    sessionValue = makeSession({ role: 'bgj' });
    scopeRow = { customer_code: 'A999999' };
    const res = await PATCH(patchRequest({ name: '山田太郎' }), { params });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalled();
  });
});
