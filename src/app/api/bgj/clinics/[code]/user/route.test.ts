// @vitest-environment node
// BGJ職員による医院ログインアカウントの発行・編集。email列を追加した際の
// insert/update呼び出し引数を検証する（未入力ならnullを保存すること）。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const requireBgjSessionMock = vi.fn(() => true);
vi.mock('@/lib/auth/clinicScope', () => ({
  requireBgjSession: (...args: unknown[]) => requireBgjSessionMock(...(args as [])),
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(async () => ({ user: { role: 'bgj' } })),
}));

const insertSpy = vi.fn();
const updateSpy = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'clinic_users') throw new Error(`unexpected table: ${table}`);
      return {
        insert: (row: Record<string, unknown>) => {
          insertSpy(row);
          return {
            select: () => ({
              single: async () => ({ data: { id: 'u1', ...row }, error: null }),
            }),
          };
        },
        update: (patch: Record<string, unknown>) => {
          updateSpy(patch);
          return {
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'u1', ...patch }, error: null }),
                }),
              }),
            }),
          };
        },
      };
    },
  }),
}));

const { POST, PATCH } = await import('./route');

function jsonRequest(method: string, body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/bgj/clinics/A000001/user', {
    method,
    body: JSON.stringify(body),
  });
}

describe('/api/bgj/clinics/[code]/user', () => {
  beforeEach(() => {
    insertSpy.mockClear();
    updateSpy.mockClear();
    requireBgjSessionMock.mockReturnValue(true);
  });

  it('POST: emailを渡すとinsertに含める', async () => {
    const req = jsonRequest('POST', { loginId: 'chuo-shika', password: 'initpass123', email: 'staff@example.com' });
    const res = await POST(req, { params: Promise.resolve({ code: 'A000001' }) });
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ email: 'staff@example.com' }));
  });

  it('POST: email未入力ならnullを保存する', async () => {
    const req = jsonRequest('POST', { loginId: 'chuo-shika', password: 'initpass123' });
    await POST(req, { params: Promise.resolve({ code: 'A000001' }) });
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ email: null }));
  });

  it('PATCH: emailを渡すとupdateに含める（既存スタッフへの後付け登録）', async () => {
    const req = jsonRequest('PATCH', { id: 'u1', email: 'staff2@example.com' });
    const res = await PATCH(req, { params: Promise.resolve({ code: 'A000001' }) });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ email: 'staff2@example.com' }));
  });

  it('PATCH: emailを渡さなければupdate対象に含めない（他フィールドのみの更新を壊さない）', async () => {
    const req = jsonRequest('PATCH', { id: 'u1', status: '無効' });
    await PATCH(req, { params: Promise.resolve({ code: 'A000001' }) });
    expect(updateSpy).toHaveBeenCalledWith(expect.not.objectContaining({ email: expect.anything() }));
  });

  it('PATCH: 担当者一覧からログインIDを変更できる', async () => {
    const req = jsonRequest('PATCH', { id: 'u1', loginId: 'new-login-id' });
    const res = await PATCH(req, { params: Promise.resolve({ code: 'A000001' }) });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ login_id: 'new-login-id' }));
  });

  it('POST: 8文字未満の初期パスワードを拒否する', async () => {
    const req = jsonRequest('POST', { loginId: 'chuo-shika', password: 'short' });
    const res = await POST(req, { params: Promise.resolve({ code: 'A000001' }) });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
