// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
let customerCodeValue: string | null = null;

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/patientScope', () => ({
  resolveEffectiveCustomerCode: async () => customerCodeValue,
}));

let qaRows: unknown[] = [];
const eqSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          eqSpy(...args);
          return {
            eq: (...args2: unknown[]) => {
              eqSpy(...args2);
              return { order: () => ({ limit: async () => ({ data: qaRows, error: null }) }) };
            },
          };
        },
      }),
    }),
  }),
}));

const { GET } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'patient', customerCode: 'A000001', patientId: 'patient-1', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('GET /api/patient-portal/qa', () => {
  beforeEach(() => {
    sessionValue = null;
    customerCodeValue = null;
    qaRows = [];
    eqSpy.mockReset();
  });

  it('得意先を解決できない場合は空配列を返す', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ qa: [] });
  });

  it('公開ステータスのQ&Aのみを対象クエリで絞り込んで返す', async () => {
    sessionValue = makeSession();
    customerCodeValue = 'A000001';
    qaRows = [{ id: 'qa-1', status: '公開', question: 'Q' }];
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.qa).toEqual(qaRows);
    expect(eqSpy).toHaveBeenCalledWith('customer_code', 'A000001');
    expect(eqSpy).toHaveBeenCalledWith('status', '公開');
  });
});
