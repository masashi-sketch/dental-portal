// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authMock = vi.fn();
const rpcMock = vi.fn(async () => ({ error: null }));
vi.mock('@/auth', () => ({ auth: () => authMock() }));
vi.mock('@/lib/auth/password', () => ({ hashPassword: (value: string) => `hashed:${value}` }));
vi.mock('@/lib/supabase/server', () => ({ getSupabaseServerClient: () => ({ rpc: rpcMock }) }));

const { POST } = await import('./route');
const request = (password: string, confirmation = password) => new NextRequest('http://localhost/api/clinic-change-password', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password, confirmation }),
});

describe('POST /api/clinic-change-password', () => {
  beforeEach(() => {
    authMock.mockReset(); rpcMock.mockClear(); rpcMock.mockResolvedValue({ error: null });
    authMock.mockResolvedValue({ user: { role: 'clinic', clinicUserId: 'user-1', clinicMustChangePassword: true } });
  });

  it('未認証は401', async () => {
    authMock.mockResolvedValue(null);
    expect((await POST(request('new-password'))).status).toBe(401);
  });

  it('初期パスワードの再利用を拒否する', async () => {
    expect((await POST(request('A123456789A'))).status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('確認値の不一致を拒否する', async () => {
    expect((await POST(request('new-password', 'different-password'))).status).toBe(400);
  });

  it('ハッシュを初回変更完了RPCへ渡す', async () => {
    const response = await POST(request('new-password'));
    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith('complete_initial_clinic_password_change', {
      p_clinic_user_id: 'user-1', p_password_hash: 'hashed:new-password',
    });
  });
});
