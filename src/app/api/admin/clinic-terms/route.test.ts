// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let termsRow: Record<string, unknown> | null = null;
const eqSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          eqSpy(...args);
          return { maybeSingle: async () => ({ data: termsRow, error: null }) };
        },
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

function getRequest(customerCode: string | null) {
  const url = customerCode
    ? `http://localhost/api/admin/clinic-terms?customerCode=${customerCode}`
    : 'http://localhost/api/admin/clinic-terms';
  return new NextRequest(url);
}

describe('GET /api/admin/clinic-terms', () => {
  beforeEach(() => {
    sessionValue = null;
    termsRow = null;
    eqSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await GET(getRequest(null));
    expect(res.status).toBe(401);
  });

  it('clinicロールは自院のcustomer_codeで絞り込む（クエリ指定は無視される）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    termsRow = { customer_code: 'A000001', commission_rate: 10 };
    const res = await GET(getRequest('A999999'));
    const body = await res.json();
    expect(eqSpy).toHaveBeenCalledWith('customer_code', 'A000001');
    expect(body.terms).toEqual(termsRow);
  });

  it('bgjロールがcustomerCodeを指定しないとterms:nullを返す', async () => {
    sessionValue = makeSession({ role: 'bgj' });
    const res = await GET(getRequest(null));
    const body = await res.json();
    expect(body).toEqual({ terms: null });
  });
});
