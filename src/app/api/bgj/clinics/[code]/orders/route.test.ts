// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let orderRows: unknown[] = [];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: orderRows, error: null }),
          }),
        }),
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

const params = Promise.resolve({ code: 'A000001' });

describe('GET /api/bgj/clinics/[code]/orders', () => {
  beforeEach(() => {
    sessionValue = null;
    orderRows = [];
  });

  it('未認証なら401', async () => {
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001/orders'), { params });
    expect(res.status).toBe(401);
  });

  it('clinicロールは401（BGJ専用）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001/orders'), { params });
    expect(res.status).toBe(401);
  });

  it('得意先の注文一覧を返す', async () => {
    sessionValue = makeSession();
    orderRows = [{ id: 'order-1', customer_code: 'A000001', amount: 5000 }];
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001/orders'), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.orders).toEqual(orderRows);
  });
});
