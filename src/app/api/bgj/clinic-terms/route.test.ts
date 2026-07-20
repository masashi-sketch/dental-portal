// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let termsRows: unknown[] = [];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        limit: async () => ({ data: termsRows, error: null }),
      }),
    }),
  }),
}));

const { GET } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('GET /api/bgj/clinic-terms', () => {
  beforeEach(() => {
    sessionValue = null;
    termsRows = [];
  });

  it('未認証なら401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('clinicロールは401（BGJ専用）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('全得意先の取引条件一覧を返す', async () => {
    sessionValue = makeSession();
    termsRows = [{ customer_code: 'A000001', commission_rate: 10 }];
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.terms).toEqual(termsRows);
  });
});
