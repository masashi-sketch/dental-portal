// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
const eqSpy = vi.fn();

const rows: Record<string, unknown[]> = {
  clinics: [{ customer_code: 'A000001', name: '広島中央歯科' }],
  patients: [{ id: 'patient-1', customer_code: 'A000001', patient_no: 'P000001', name: '患者 花子' }],
  products: [
    { id: 'product-1', name: '商品A', product_code: 'PRD-1', price: 1000, unit: '箱' },
    { id: 'product-2', name: '商品B', product_code: 'PRD-2', price: 500, unit: '袋' },
  ],
  clinic_product_settings: [{ customer_code: 'A000001', product_id: 'product-2', is_visible: false, updated_at: '2026-07-22' }],
};

function builder(table: string) {
  const result = { data: rows[table], error: null };
  const query = {
    select: () => query,
    order: () => query,
    limit: () => query,
    ilike: () => query,
    eq: (column: string, value: string) => { eqSpy(table, column, value); return query; },
    maybeSingle: async () => ({ data: rows[table][0] ?? null, error: null }),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(resolve(result)),
  };
  return query;
}

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/clinicScope', () => ({
  requireBgjSession: (session: Session | null) => session?.user?.role === 'bgj',
}));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({ from: (table: string) => builder(table) }),
}));

const { GET } = await import('./route');

function request(query = '') {
  return new NextRequest(`http://localhost/api/bgj/orders/create-options${query}`);
}

describe('GET /api/bgj/orders/create-options', () => {
  beforeEach(() => {
    sessionValue = null;
    eqSpy.mockReset();
  });

  it('BGJ以外のセッションを拒否する', async () => {
    expect((await GET(request())).status).toBe(401);
  });

  it('医院候補を返す', async () => {
    sessionValue = { user: { role: 'bgj', email: 'operator@biogaia.jp' }, expires: '2099-01-01' } as Session;
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect((await response.json()).clinics).toEqual(rows.clinics);
  });

  it('選択医院の有効患者と表示可能商品だけを返す', async () => {
    sessionValue = { user: { role: 'bgj', email: 'operator@biogaia.jp' }, expires: '2099-01-01' } as Session;
    const response = await GET(request('?customerCode=A000001'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(eqSpy).toHaveBeenCalledWith('patients', 'customer_code', 'A000001');
    expect(eqSpy).toHaveBeenCalledWith('patients', 'status', '有効');
    expect(body.patients).toEqual(rows.patients);
    expect(body.products).toEqual([rows.products[0]]);
  });
});
