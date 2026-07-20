// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
let patientIdValue: string | null = null;
let orderRows: unknown[] = [];

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/patientScope', () => ({ resolveEffectivePatientId: async () => patientIdValue }));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'patient_orders') throw new Error(`unexpected table: ${table}`);
      return { select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: orderRows, error: null }) }) }) }) };
    },
  }),
}));

const { GET } = await import('./route');

describe('GET /api/patient-portal/orders', () => {
  beforeEach(() => {
    sessionValue = { user: { role: 'patient', patientId: 'patient-1', customerCode: 'A000001' }, expires: '2099-01-01' } as Session;
    patientIdValue = 'patient-1';
    orderRows = [{ id: 'order-1', patient_id: 'patient-1', items: [{ product_name: '商品A' }] }];
  });

  it('未認証時は注文を返さない', async () => {
    sessionValue = null;
    const response = await GET();
    expect(await response.json()).toEqual({ orders: [] });
  });

  it('有効患者を解決できないプレビューでは注文を返さない', async () => {
    patientIdValue = null;
    const response = await GET();
    expect(await response.json()).toEqual({ orders: [] });
  });

  it('本人または検証済みプレビュー患者の注文だけを返す', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.orders).toEqual(orderRows);
  });
});
