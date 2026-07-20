// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({ auth: async () => sessionValue }));

let settingsRow: Record<string, unknown> | null = {
  dashboard_followup_days: 60,
  dashboard_dormant_days: 90,
  dashboard_include_never_ordered: true,
};
let rpcResult: { data: unknown; error: { message: string } | null } = { data: { kpis: { totalClinicCount: 3 } }, error: null };
const rpcSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: settingsRow, error: null }),
        }),
      }),
    }),
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcSpy(name, args);
      return rpcResult;
    },
  }),
}));

const { GET } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('GET /api/bgj/dashboard-overview', () => {
  beforeEach(() => {
    sessionValue = null;
    settingsRow = {
      dashboard_followup_days: 60,
      dashboard_dormant_days: 90,
      dashboard_include_never_ordered: true,
    };
    rpcResult = { data: { kpis: { totalClinicCount: 3 } }, error: null };
    rpcSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('clinicロールは401（BGJ専用）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('app_settingsの閾値をそのままRPCへ渡す', async () => {
    sessionValue = makeSession();
    settingsRow = { dashboard_followup_days: 45, dashboard_dormant_days: 75, dashboard_include_never_ordered: false };
    const res = await GET();
    expect(res.status).toBe(200);
    expect(rpcSpy).toHaveBeenCalledWith('get_bgj_dashboard_overview', {
      p_followup_days: 45,
      p_dormant_days: 75,
      p_include_never_ordered: false,
    });
  });

  it('RPC結果をそのままoverviewとして返す', async () => {
    sessionValue = makeSession();
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ overview: { kpis: { totalClinicCount: 3 } } });
  });

  it('RPCがエラーを返すと500', async () => {
    sessionValue = makeSession();
    rpcResult = { data: null, error: { message: 'db error' } };
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
