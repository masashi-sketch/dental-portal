// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

type ScopeRow = { customer_code: string } | null;
let scopeRow: ScopeRow = null;
let currentOrder: { status: string; fulfillment_method: string } = {
  status: 'received',
  fulfillment_method: 'pickup',
};
const updateSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: scopeRow }),
          single: async () => ({ data: currentOrder, error: null }),
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        updateSpy(patch);
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'order-1', ...currentOrder, ...patch }, error: null }),
            }),
          }),
        };
      },
    }),
  }),
}));

const { PATCH } = await import('./route');

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/orders/order-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 'order-1' });

describe('PATCH /api/admin/orders/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    scopeRow = { customer_code: 'A000001' };
    currentOrder = { status: 'received', fulfillment_method: 'pickup' };
    updateSpy.mockReset();
  });

  it('未認証なら401（更新しない）', async () => {
    const res = await PATCH(patchRequest({ status: 'preparing' }), { params });
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('patientロールは401（更新しない）', async () => {
    sessionValue = makeSession({ role: 'patient', patientId: 'p1' });
    const res = await PATCH(patchRequest({ status: 'preparing' }), { params });
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('clinicロールが他院の注文を更新しようとすると404（更新しない）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A999999' });
    scopeRow = { customer_code: 'A000001' };
    const res = await PATCH(patchRequest({ status: 'preparing' }), { params });
    expect(res.status).toBe(404);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('不正なステータス文字列は400（更新しない）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await PATCH(patchRequest({ status: 'not-a-status' }), { params });
    expect(res.status).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('許可されていない遷移は409（更新しない）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    currentOrder = { status: 'received', fulfillment_method: 'pickup' };
    // receivedからcompletedへは直接遷移できない
    const res = await PATCH(patchRequest({ status: 'completed' }), { params });
    expect(res.status).toBe(409);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('許可された遷移は成功する', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    currentOrder = { status: 'received', fulfillment_method: 'pickup' };
    const res = await PATCH(patchRequest({ status: 'preparing' }), { params });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith({ status: 'preparing' });
  });
});
