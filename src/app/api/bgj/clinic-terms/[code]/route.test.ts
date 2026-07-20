// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let termsRow: Record<string, unknown> | null = null;
const upsertSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: termsRow, error: null }),
        }),
      }),
      upsert: (row: Record<string, unknown>) => {
        upsertSpy(row);
        return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
      },
    }),
  }),
}));

const { GET, PUT } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function putRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/bgj/clinic-terms/A000001', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ code: 'A000001' });

describe('GET /api/bgj/clinic-terms/[code]', () => {
  beforeEach(() => {
    sessionValue = null;
    termsRow = null;
  });

  it('未認証なら401', async () => {
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinic-terms/A000001'), { params });
    expect(res.status).toBe(401);
  });

  it('得意先の取引条件を返す（無ければnull）', async () => {
    sessionValue = makeSession();
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinic-terms/A000001'), { params });
    const body = await res.json();
    expect(body).toEqual({ terms: null });
  });
});

describe('PUT /api/bgj/clinic-terms/[code]', () => {
  beforeEach(() => {
    sessionValue = null;
    upsertSpy.mockReset();
  });

  it('未認証なら401（更新しない）', async () => {
    const res = await PUT(putRequest({ commissionRate: 10 }), { params });
    expect(res.status).toBe(401);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('未指定の数値項目は0として保存され、更新者メールが記録される', async () => {
    sessionValue = makeSession({ email: 'yamada@biogaia.jp' });
    const res = await PUT(putRequest({}), { params });
    expect(res.status).toBe(200);
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_code: 'A000001',
        commission_rate: 0,
        wholesale_rate: 0,
        updated_by: 'yamada@biogaia.jp',
      }),
    );
  });

  it('指定した値で更新できる', async () => {
    sessionValue = makeSession();
    await PUT(putRequest({ commissionRate: 15, wholesaleRate: 60, paymentMethod: '口座振替' }), { params });
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ commission_rate: 15, wholesale_rate: 60, payment_method: '口座振替' }),
    );
  });
});
