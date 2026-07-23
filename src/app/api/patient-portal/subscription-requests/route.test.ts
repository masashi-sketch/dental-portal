// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
const rpcSpy = vi.fn();
const requestRow = {
  id: '99999999-9999-4999-8999-999999999999', request_number: 12, customer_code: 'A000001',
  patient_id: '11111111-1111-4111-8111-111111111111', term_months: 3, fulfillment_method: 'delivery',
  status: 'submitted', version: 1, submitted_at: '2026-07-23T00:00:00Z', reviewed_at: null,
  canceled_at: null, created_at: '2026-07-23T00:00:00Z', updated_at: '2026-07-23T00:00:00Z',
  items: [], destination: null,
};

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    rpc: (...args: unknown[]) => rpcSpy(...args),
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        order: async () => ({ data: [requestRow], error: null }),
        single: async () => ({ data: requestRow, error: null }),
      };
      return query;
    },
  }),
}));

const { GET, POST } = await import('./route');
const validBody = {
  productId: '22222222-2222-4222-8222-222222222222', quantity: 1, termMonths: 3,
  fulfillmentMethod: 'delivery', deliveryDestinationId: '33333333-3333-4333-8333-333333333333',
  idempotencyKey: '44444444-4444-4444-8444-444444444444', consent: true,
};

describe('/api/patient-portal/subscription-requests', () => {
  beforeEach(() => { sessionValue = null; rpcSpy.mockReset(); rpcSpy.mockResolvedValue({ data: requestRow.id, error: null }); });

  it('未認証とスタッフプレビューからの正式申込を拒否する', async () => {
    const request = () => new NextRequest('http://localhost/api/patient-portal/subscription-requests', { method: 'POST', body: JSON.stringify(validBody) });
    expect((await POST(request())).status).toBe(401);
    sessionValue = { user: { role: 'clinic', customerCode: 'A000001' }, expires: '2099-01-01' } as Session;
    expect((await POST(request())).status).toBe(401);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('患者本人の同意済み申込を冪等RPCへ渡す', async () => {
    sessionValue = { user: { role: 'patient', customerCode: 'A000001', patientId: requestRow.patient_id, email: 'patient@example.com' }, expires: '2099-01-01' } as Session;
    const response = await POST(new NextRequest('http://localhost/api/patient-portal/subscription-requests', { method: 'POST', body: JSON.stringify(validBody) }));
    expect(response.status).toBe(201);
    expect(rpcSpy).toHaveBeenCalledWith('create_patient_subscription_request', {
      p_customer_code: 'A000001', p_patient_id: requestRow.patient_id,
      p_product_id: validBody.productId, p_quantity: 1, p_term_months: 3,
      p_fulfillment_method: 'delivery', p_delivery_destination_id: validBody.deliveryDestinationId,
      p_idempotency_key: validBody.idempotencyKey, p_actor_identifier: 'patient@example.com',
    });
  });

  it('同意なしの申込をDBへ送らない', async () => {
    sessionValue = { user: { role: 'patient', customerCode: 'A000001', patientId: requestRow.patient_id }, expires: '2099-01-01' } as Session;
    const response = await POST(new NextRequest('http://localhost/api/patient-portal/subscription-requests', { method: 'POST', body: JSON.stringify({ ...validBody, consent: false }) }));
    expect(response.status).toBe(400);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('患者本人の申込履歴だけを返す', async () => {
    sessionValue = { user: { role: 'patient', customerCode: 'A000001', patientId: requestRow.patient_id }, expires: '2099-01-01' } as Session;
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).requests[0].id).toBe(requestRow.id);
  });
});
