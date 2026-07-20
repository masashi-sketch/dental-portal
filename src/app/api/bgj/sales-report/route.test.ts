// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({ auth: async () => sessionValue }));

let settingsRow: Record<string, unknown> | null = { report_period_months: 6 };
let rpcResult: { data: unknown; error: { message: string } | null } = { data: { summary: { totalSales: 1000 } }, error: null };
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

describe('GET /api/bgj/sales-report', () => {
  beforeEach(() => {
    sessionValue = null;
    settingsRow = { report_period_months: 6 };
    rpcResult = { data: { summary: { totalSales: 1000 } }, error: null };
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

  it('app_settingsの集計期間をそのままRPCへ渡す', async () => {
    sessionValue = makeSession();
    settingsRow = { report_period_months: 12 };
    const res = await GET();
    expect(res.status).toBe(200);
    expect(rpcSpy).toHaveBeenCalledWith('get_bgj_sales_report', { p_months: 12 });
  });

  it('RPC結果をそのままreportとして返す', async () => {
    sessionValue = makeSession();
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ report: { summary: { totalSales: 1000 } } });
  });

  it('RPCがエラーを返すと500', async () => {
    sessionValue = makeSession();
    rpcResult = { data: null, error: { message: 'db error' } };
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
