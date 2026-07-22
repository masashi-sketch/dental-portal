// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
const eqSpy = vi.fn();
const rangeSpy = vi.fn();
const rpcSpy = vi.fn();
const orderRows = [{
  id: 'order-1', customer_code: 'A000001', patient_id: 'patient-1', order_type: 'one_time',
  fulfillment_method: 'pickup', status: 'received', ordered_at: '2026-07-22T00:00:00.000Z',
  next_fulfillment_date: null, source: 'internal', external_order_id: null, sync_status: 'local',
  created_via: 'clinic_portal',
  sync_error: null, idempotency_key: null, external_updated_at: null,
  created_at: '2026-07-22T00:00:00.000Z', updated_at: '2026-07-22T00:00:00.000Z',
  patient: { id: 'patient-1', patient_no: 'P000001', name: '患者 花子' },
  items: [{
    id: 'line-1', order_id: 'order-1', product_id: 'product-1', product_name: '商品A', unit_price: 1000,
    quantity: 2, unit_snapshot: null, image_type_snapshot: 'supplement', daily_amount_snapshot: null,
    volume_snapshot: null, caution_snapshot: null, external_line_item_id: null,
    created_at: '2026-07-22T00:00:00.000Z',
  }],
}];

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/clinicScope', () => ({
  requireBgjSession: (session: Session | null) => session?.user?.role === 'bgj',
}));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'patient_orders') {
        const query = {
          select: () => query,
          order: () => query,
          eq: (column: string, value: string) => { eqSpy(column, value); return query; },
          single: async () => ({ data: orderRows[0], error: null }),
          range: async (from: number, to: number) => {
            rangeSpy(from, to);
            return { data: orderRows, error: null, count: 1 };
          },
        };
        return query;
      }
      if (table === 'clinics') {
        const clinicQuery = {
          in: async () => ({ data: [{ customer_code: 'A000001', name: '広島中央歯科' }], error: null }),
          eq: () => clinicQuery,
          single: async () => ({ data: { name: '広島中央歯科' }, error: null }),
        };
        return {
          select: () => clinicQuery,
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
    rpc: (...args: unknown[]) => rpcSpy(...args),
  }),
}));

const { GET, POST } = await import('./route');

function request(query = '') {
  return new NextRequest(`http://localhost/api/bgj/orders${query}`);
}

describe('GET /api/bgj/orders', () => {
  beforeEach(() => {
    sessionValue = null;
    eqSpy.mockReset();
    rangeSpy.mockReset();
    rpcSpy.mockReset();
    rpcSpy.mockResolvedValue({ data: 'order-1', error: null });
  });

  it('BGJ以外のセッションを拒否する', async () => {
    expect((await GET(request())).status).toBe(401);
    sessionValue = { user: { role: 'clinic', customerCode: 'A000001' }, expires: '2099-01-01' } as Session;
    expect((await GET(request())).status).toBe(401);
  });

  it('全医院の患者注文をページングし、外部連携用の正規化形式で返す', async () => {
    sessionValue = { user: { role: 'bgj' }, expires: '2099-01-01' } as Session;
    const response = await GET(request('?page=2'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(rangeSpy).toHaveBeenCalledWith(50, 99);
    expect(body.total).toBe(1);
    expect(body.orders[0]).toMatchObject({
      schemaVersion: 1,
      orderId: 'order-1',
      totalAmount: 2000,
      clinic: { customerCode: 'A000001', name: '広島中央歯科' },
      patient: { patientNo: 'P000001', name: '患者 花子' },
    });
  });

  it('業務状態・連携元・同期状態で絞り込む', async () => {
    sessionValue = { user: { role: 'bgj' }, expires: '2099-01-01' } as Session;
    const response = await GET(request('?status=received&source=internal&syncStatus=pending&customerCode=A000001&externalOrderId=shopify-100'));

    expect(response.status).toBe(200);
    expect(eqSpy).toHaveBeenCalledWith('status', 'received');
    expect(eqSpy).toHaveBeenCalledWith('source', 'internal');
    expect(eqSpy).toHaveBeenCalledWith('sync_status', 'pending');
    expect(eqSpy).toHaveBeenCalledWith('customer_code', 'A000001');
    expect(eqSpy).toHaveBeenCalledWith('external_order_id', 'shopify-100');
  });

  it('不正な絞り込み条件を拒否する', async () => {
    sessionValue = { user: { role: 'bgj' }, expires: '2099-01-01' } as Session;
    expect((await GET(request('?status=unknown'))).status).toBe(400);
    expect((await GET(request('?customerCode=%28invalid%29'))).status).toBe(400);
  });

  it('BGJが複数明細の医院受け取り注文を冪等キー付きで登録する', async () => {
    sessionValue = { user: { role: 'bgj', email: 'operator@biogaia.jp' }, expires: '2099-01-01' } as Session;
    const response = await POST(new NextRequest('http://localhost/api/bgj/orders', {
      method: 'POST',
      body: JSON.stringify({
        customerCode: 'A000001',
        patientId: '11111111-1111-4111-8111-111111111111',
        idempotencyKey: '22222222-2222-4222-8222-222222222222',
        items: [
          { productId: '33333333-3333-4333-8333-333333333333', quantity: 2 },
          { productId: '44444444-4444-4444-8444-444444444444', quantity: 1 },
        ],
      }),
    }));

    expect(response.status).toBe(201);
    expect(rpcSpy).toHaveBeenCalledWith('create_bgj_patient_order', {
      p_customer_code: 'A000001',
      p_patient_id: '11111111-1111-4111-8111-111111111111',
      p_items: [
        { productId: '33333333-3333-4333-8333-333333333333', quantity: 2 },
        { productId: '44444444-4444-4444-8444-444444444444', quantity: 1 },
      ],
      p_idempotency_key: '22222222-2222-4222-8222-222222222222',
      p_actor_identifier: 'operator@biogaia.jp',
    });
  });

  it('重複商品や不正な注文内容をDBへ送らない', async () => {
    sessionValue = { user: { role: 'bgj', email: 'operator@biogaia.jp' }, expires: '2099-01-01' } as Session;
    const productId = '33333333-3333-4333-8333-333333333333';
    const response = await POST(new NextRequest('http://localhost/api/bgj/orders', {
      method: 'POST',
      body: JSON.stringify({
        customerCode: 'A000001',
        patientId: '11111111-1111-4111-8111-111111111111',
        idempotencyKey: '22222222-2222-4222-8222-222222222222',
        items: [{ productId, quantity: 1 }, { productId, quantity: 2 }],
      }),
    }));

    expect(response.status).toBe(400);
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
