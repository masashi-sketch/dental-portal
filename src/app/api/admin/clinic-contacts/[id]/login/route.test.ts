// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authMock = vi.fn();
const permissionMock = vi.fn(() => true);
const rpcMock = vi.fn(async () => ({ data: 'user-1', error: null }));

vi.mock('@/auth', () => ({ auth: () => authMock() }));
vi.mock('@/lib/auth/clinicScope', () => ({ hasClinicPermission: (...args: unknown[]) => permissionMock(...(args as [])) }));
vi.mock('@/lib/auth/password', () => ({ hashPassword: (value: string) => `hashed:${value}` }));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    rpc: rpcMock,
    from: (table: string) => {
      if (table === 'clinic_contacts') return {
        select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: { customer_code: 'A000001', clinic_user_id: null } }) }) }) }),
      };
      if (table === 'clinic_users') return {
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'user-1', login_id: 'staff01', status: '有効' }, error: null }) }) }),
      };
      if (table === 'clinic_user_role_assignments') return {
        select: () => ({ eq: () => ({ single: async () => ({ data: { role_key: 'staff' }, error: null }) }) }),
      };
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { PUT } = await import('./route');

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/clinic-contacts/contact-1/login', {
    method: 'PUT', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });
}

const context = { params: Promise.resolve({ id: 'contact-1' }) };

describe('PUT /api/admin/clinic-contacts/[id]/login', () => {
  beforeEach(() => {
    authMock.mockReset();
    permissionMock.mockReset();
    permissionMock.mockReturnValue(true);
    rpcMock.mockClear();
    rpcMock.mockResolvedValue({ data: 'user-1', error: null });
  });

  it('未認証は401', async () => {
    authMock.mockResolvedValue(null);
    expect((await PUT(request({}), context)).status).toBe(401);
  });

  it('管理権限がなければ403', async () => {
    authMock.mockResolvedValue({ user: { role: 'clinic', customerCode: 'A000001' } });
    permissionMock.mockReturnValue(false);
    expect((await PUT(request({}), context)).status).toBe(403);
  });

  it('担当者単位のRPCにハッシュと権限を渡す', async () => {
    authMock.mockResolvedValue({ user: { role: 'clinic', customerCode: 'A000001', email: null, name: '医院管理者' } });
    const response = await PUT(request({
      loginId: 'staff01', password: 'password123', email: 'STAFF@example.com', status: '有効', roleKey: 'staff',
    }), context);
    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith('save_clinic_contact_login', expect.objectContaining({
      p_contact_id: 'contact-1', p_customer_code: 'A000001', p_login_id: 'staff01',
      p_password_hash: 'hashed:password123', p_email: 'staff@example.com', p_role_key: 'staff', p_actor_type: 'clinic',
    }));
  });

  it('別医院の担当者は404にする', async () => {
    authMock.mockResolvedValue({ user: { role: 'clinic', customerCode: 'A999999' } });
    expect((await PUT(request({ loginId: 'staff01', password: 'password123' }), context)).status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
