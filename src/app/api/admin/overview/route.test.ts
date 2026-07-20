// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
let rpcResult: { data: unknown; error: { message: string } | null } = {
  data: { counts: { patientCount: 2 } },
  error: null,
};
const rpcSpy = vi.fn();

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/clinicScope', () => ({
  resolveScopedCustomerCode: (session: Session, requested: string | null) => (
    session.user.role === 'clinic' ? session.user.customerCode : requested
  ),
}));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcSpy(name, args);
      return rpcResult;
    },
  }),
}));

const { GET } = await import('./route');

function request(query = '') {
  return new NextRequest(`http://localhost/api/admin/overview${query}`);
}

describe('GET /api/admin/overview', () => {
  beforeEach(() => {
    sessionValue = null;
    rpcResult = { data: { counts: { patientCount: 2 } }, error: null };
    rpcSpy.mockReset();
  });

  it('未認証・患者ロールを拒否する', async () => {
    expect((await GET(request())).status).toBe(401);
    sessionValue = { user: { role: 'patient', patientId: 'patient-1' }, expires: '2099-01-01' } as Session;
    expect((await GET(request())).status).toBe(401);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('医院ロールはクエリで指定された他院コードを信用しない', async () => {
    sessionValue = { user: { role: 'clinic', customerCode: 'A000001' }, expires: '2099-01-01' } as Session;
    const response = await GET(request('?customerCode=OTHER'));
    expect(response.status).toBe(200);
    expect(rpcSpy).toHaveBeenCalledWith('get_admin_overview', { p_customer_code: 'A000001' });
    expect((await response.json()).overview).toEqual({ counts: { patientCount: 2 } });
  });

  it('BGJロールは対象医院コードが必要', async () => {
    sessionValue = { user: { role: 'bgj', customerCode: null }, expires: '2099-01-01' } as Session;
    expect((await GET(request())).status).toBe(400);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('DB集計エラーを500で返す', async () => {
    sessionValue = { user: { role: 'clinic', customerCode: 'A000001' }, expires: '2099-01-01' } as Session;
    rpcResult = { data: null, error: { message: 'database error' } };
    const response = await GET(request());
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('database error');
  });
});
