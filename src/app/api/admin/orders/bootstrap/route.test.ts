// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';
import { NextRequest } from 'next/server';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/clinicScope', () => ({
  resolveScopedCustomerCode: async (session: Session) => session.user.customerCode ?? null,
}));

const rows: Record<string, { data: unknown; error: { message: string } | null }> = {};

function queryFor(table: string) {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: () => query,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows[table]).then(resolve, reject),
  };
  return query;
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({ from: (table: string) => queryFor(table) }),
}));

const { GET } = await import('./route');

function request() {
  return new NextRequest('http://localhost/api/admin/orders/bootstrap');
}

function clinicSession(): Session {
  return {
    user: { role: 'clinic', customerCode: 'A000001', patientId: null, email: 'clinic@example.com' },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('GET /api/admin/orders/bootstrap', () => {
  beforeEach(() => {
    sessionValue = null;
    rows.patient_orders = { data: [{ id: 'order-1' }], error: null };
    rows.patients = { data: [{ id: 'patient-1', status: '有効' }], error: null };
    rows.products = { data: [{ id: 'product-1', name: '商品' }], error: null };
    rows.clinic_product_settings = { data: [{ product_id: 'product-1', is_visible: false }], error: null };
  });

  it('未認証なら401', async () => {
    expect((await GET(request())).status).toBe(401);
  });

  it('注文・患者・商品をまとめて返しServer-Timingを付ける', async () => {
    sessionValue = clinicSession();
    const response = await GET(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.orders).toEqual([{ id: 'order-1' }]);
    expect(body.patients).toEqual([{ id: 'patient-1', status: '有効' }]);
    expect(body.products).toEqual([{ id: 'product-1', name: '商品', isVisible: false }]);
    expect(response.headers.get('server-timing')).toMatch(/auth;dur=.*database;dur=.*total;dur=/);
  });

  it('いずれかのDB照会が失敗した場合は500', async () => {
    sessionValue = clinicSession();
    rows.products = { data: null, error: { message: 'database error' } };
    expect((await GET(request())).status).toBe(500);
  });
});
