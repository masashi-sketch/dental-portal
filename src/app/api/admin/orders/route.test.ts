// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
let orderRows: unknown[] = [];
const eqSpy = vi.fn();
const rpcSpy = vi.fn();

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/clinicScope', () => ({
  resolveScopedCustomerCode: (session: Session, requested: string | null) => session.user.role === 'clinic' ? session.user.customerCode : requested,
}));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcSpy(name, args);
      return { data: '11111111-1111-4111-8111-111111111111', error: null };
    },
    from: (table: string) => {
      if (table !== 'patient_orders') throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          eq: (column: string, value: string) => {
            eqSpy(column, value);
            return {
              order: () => ({ limit: async () => ({ data: orderRows, error: null }) }),
              single: async () => ({ data: orderRows[0], error: null }),
            };
          },
        }),
      };
    },
  }),
}));

const { GET, POST } = await import('./route');

function request(query = '') {
  return new NextRequest(`http://localhost/api/admin/orders${query}`);
}

function postRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/orders', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/admin/orders', () => {
  beforeEach(() => {
    sessionValue = null;
    orderRows = [{ id: 'order-1' }];
    eqSpy.mockReset();
    rpcSpy.mockReset();
  });

  it('未認証・患者ロールを拒否する', async () => {
    expect((await GET(request())).status).toBe(401);
    sessionValue = { user: { role: 'patient', patientId: 'patient-1' }, expires: '2099-01-01' } as Session;
    expect((await GET(request())).status).toBe(401);
  });

  it('医院ロールではクエリ指定を信用せず自院コードで絞り込む', async () => {
    sessionValue = { user: { role: 'clinic', customerCode: 'A000001' }, expires: '2099-01-01' } as Session;
    const response = await GET(request('?customerCode=OTHER'));
    expect(response.status).toBe(200);
    expect(eqSpy).toHaveBeenCalledWith('customer_code', 'A000001');
    expect((await response.json()).orders).toEqual(orderRows);
  });
});

describe('POST /api/admin/orders', () => {
  beforeEach(() => {
    sessionValue = { user: { role: 'clinic', customerCode: 'A000001' }, expires: '2099-01-01' } as Session;
    orderRows = [{ id: '11111111-1111-4111-8111-111111111111', items: [] }];
    rpcSpy.mockReset();
  });

  it('注文作成を冪等キー付きDBトランザクションへ渡す', async () => {
    const idempotencyKey = '22222222-2222-4222-8222-222222222222';
    const response = await POST(postRequest({
      patientId: '33333333-3333-4333-8333-333333333333',
      productId: '44444444-4444-4444-8444-444444444444',
      quantity: 2,
      fulfillmentMethod: 'pickup',
      idempotencyKey,
    }));
    expect(response.status).toBe(201);
    expect(rpcSpy).toHaveBeenCalledWith('create_internal_patient_order', expect.objectContaining({
      p_customer_code: 'A000001', p_quantity: 2, p_idempotency_key: idempotencyKey,
    }));
  });

  it('冪等キーが無いリクエストを拒否する', async () => {
    const response = await POST(postRequest({
      patientId: '33333333-3333-4333-8333-333333333333',
      productId: '44444444-4444-4444-8444-444444444444',
      quantity: 1,
      fulfillmentMethod: 'pickup',
    }));
    expect(response.status).toBe(400);
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
