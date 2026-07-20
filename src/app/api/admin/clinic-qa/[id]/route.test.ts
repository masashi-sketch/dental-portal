// @vitest-environment node
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
              single: async () => ({ data: { id: 'qa-1', ...patch }, error: null }),
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
  return new NextRequest('http://localhost/api/admin/clinic-qa/qa-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 'qa-1' });

describe('PATCH/DELETE /api/admin/clinic-qa/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    scopeRow = null;
    updateSpy.mockReset();
    deleteSpy.mockReset();
  });

  it('未認証なら401（更新処理は実行しない）', async () => {
    const res = await PATCH(patchRequest({ question: 'x' }), { params });
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('clinicロールが他院のQ&Aを更新しようとすると404になり、更新は実行されない', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A999999' };
    const res = await PATCH(patchRequest({ question: 'x' }), { params });
    expect(res.status).toBe(404);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('clinicロールが他院のQ&Aを削除しようとすると404になり、削除は実行されない', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A999999' };
    const res = await DELETE(new NextRequest('http://localhost/api/admin/clinic-qa/qa-1'), { params });
    expect(res.status).toBe(404);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('clinicロールが自院のQ&Aを更新すると成功する', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A000001' };
    const res = await PATCH(patchRequest({ question: '対応時間は？', sortOrder: 2 }), { params });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ question: '対応時間は？', sort_order: 2 }));
  });

  it('bgjロールはcustomer_codeが一致しなくてもスコープチェックを通過する', async () => {
    sessionValue = makeSession({ role: 'bgj' });
    scopeRow = { customer_code: 'A999999' };
    const res = await DELETE(new NextRequest('http://localhost/api/admin/clinic-qa/qa-1'), { params });
    expect(res.status).toBe(200);
    expect(deleteSpy).toHaveBeenCalled();
  });
});
