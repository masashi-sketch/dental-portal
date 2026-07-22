// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
let destination: Record<string, unknown> | null = null;
let rpcError: { message: string } | null = null;
const rpcSpy = vi.fn();

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/clinicScope', () => ({
  resolveScopedCustomerCode: async (session: Session) => session.user.customerCode ?? null,
}));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({ maybeSingle: async () => ({ data: destination, error: null }) }),
        }),
      }),
    }),
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcSpy(name, args);
      return { data: null, error: rpcError };
    },
  }),
}));

const { DELETE } = await import('./route');
const destinationId = '11111111-1111-4111-8111-111111111111';

function request() {
  return new NextRequest(`http://localhost/api/admin/delivery-destinations/${destinationId}`, { method: 'DELETE' });
}

describe('DELETE /api/admin/delivery-destinations/[id]', () => {
  beforeEach(() => {
    sessionValue = { user: { role: 'clinic', customerCode: 'A000001' }, expires: '2099-01-01' } as Session;
    destination = { id: destinationId, clinic_customer_code: 'A000001', patient: null };
    rpcError = null;
    rpcSpy.mockReset();
  });

  it('自院の送り先を物理削除せず論理削除RPCへ渡す', async () => {
    const response = await DELETE(request(), { params: Promise.resolve({ id: destinationId }) });
    expect(response.status).toBe(200);
    expect(rpcSpy).toHaveBeenCalledWith('archive_delivery_destination', { p_destination_id: destinationId });
  });

  it('進行中の注文で使用中なら競合として削除を拒否する', async () => {
    rpcError = { message: '進行中の注文で使用している送り先は削除できません。' };
    const response = await DELETE(request(), { params: Promise.resolve({ id: destinationId }) });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: rpcError.message });
  });

  it('他院の送り先は存在を隠して拒否する', async () => {
    destination = { id: destinationId, clinic_customer_code: 'A000002', patient: null };
    const response = await DELETE(request(), { params: Promise.resolve({ id: destinationId }) });
    expect(response.status).toBe(404);
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
