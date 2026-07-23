// @vitest-environment node
// 認証不要の公開エンドポイント。トークン自体が本人確認の役割を果たすため、
// 無効トークンの拒否と、パスワードがハッシュ化されて保存されることを検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const rpcSpy = vi.fn(async (name: string, params: Record<string, unknown>) => {
  void name; void params;
  return { error: null };
});
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    rpc: rpcSpy,
  }),
}));

const consumeClinicLoginTokenMock = vi.fn(async (): Promise<{ clinicUserId: string } | null> => null);
vi.mock('@/lib/auth/clinicLoginToken', () => ({
  consumeClinicLoginToken: (...args: unknown[]) => consumeClinicLoginTokenMock(...(args as [])),
}));

const { POST } = await import('./route');

function confirmRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/clinic-password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/clinic-password-reset/confirm', () => {
  beforeEach(() => {
    rpcSpy.mockClear();
    rpcSpy.mockResolvedValue({ error: null });
    consumeClinicLoginTokenMock.mockClear();
    consumeClinicLoginTokenMock.mockResolvedValue(null);
  });

  it('必須項目が不足していれば400', async () => {
    const res = await POST(confirmRequest({ token: 'tok' }));
    expect(res.status).toBe(400);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('パスワードが8文字未満なら400（トークン検証前に弾く）', async () => {
    const res = await POST(confirmRequest({ token: 'tok', password: 'short' }));
    expect(res.status).toBe(400);
    expect(consumeClinicLoginTokenMock).not.toHaveBeenCalled();
  });

  it('無効・期限切れトークンなら400で、パスワードは更新しない', async () => {
    const res = await POST(confirmRequest({ token: 'bad-token', password: 'password123' }));
    expect(res.status).toBe(400);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('有効なトークンならパスワードをハッシュ化して更新する', async () => {
    consumeClinicLoginTokenMock.mockResolvedValue({ clinicUserId: 'clinic-user-1' });
    const res = await POST(confirmRequest({ token: 'good-token', password: 'password123' }));
    expect(res.status).toBe(200);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith('set_clinic_user_password', expect.objectContaining({
      p_clinic_user_id: 'clinic-user-1',
    }));
    const params = rpcSpy.mock.calls[0][1] as { p_password_hash: string };
    expect(params.p_password_hash).toBeDefined();
    expect(params.p_password_hash).not.toContain('password123');
  });
});
