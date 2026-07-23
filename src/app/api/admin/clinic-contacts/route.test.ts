// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authMock = vi.fn();
const rpcMock = vi.fn();
vi.mock('@/auth', () => ({ auth: () => authMock() }));
vi.mock('@/lib/auth/clinicScope', () => ({
  hasClinicPermission: () => true,
  resolveScopedCustomerCode: async () => 'C000001',
}));
vi.mock('@/lib/auth/password', () => ({ hashPassword: (value: string) => `hashed:${value}` }));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    rpc: rpcMock,
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => table === 'clinic_contacts'
            ? { data: { clinic_user_id: 'user-1' }, error: null }
            : table === 'clinic_users'
              ? { data: { id: 'user-1', login_id: 'A000001', status: '有効' }, error: null }
              : { data: { role_key: 'staff' }, error: null },
        }),
      }),
    }),
  }),
}));

const { POST } = await import('./route');

const validBody = {
  name: '受付 太郎', roleKey: 'receptionist', portalRoleKey: 'staff', email: 'staff@example.com', phone: '',
  status: 'active', isPrimary: true, department: '受付', notes: '', emailTopics: ['webinar'], phoneTopics: [],
};

describe('POST /api/admin/clinic-contacts', () => {
  beforeEach(() => {
    authMock.mockReset(); rpcMock.mockReset();
    authMock.mockResolvedValue({ user: { role: 'bgj', email: 'operator@biogaia.jp' } });
    rpcMock.mockResolvedValue({ data: 'contact-1', error: null });
  });

  it('担当者と認証アカウントを一括作成し、担当者IDを返す', async () => {
    const request = new NextRequest('http://localhost/api/admin/clinic-contacts', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(rpcMock).toHaveBeenCalledWith('create_clinic_contact_with_login', expect.objectContaining({
      p_customer_code: 'C000001', p_password_hash: 'hashed:A123456789A', p_portal_role_key: 'staff',
      p_name: '受付 太郎', p_role_key: 'receptionist',
    }));
    await expect(response.json()).resolves.toMatchObject({
      id: 'contact-1', clinicUser: { id: 'user-1', login_id: 'A000001', role_key: 'staff' },
    });
  });
});
