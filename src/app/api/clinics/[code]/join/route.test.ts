// @vitest-environment node
// 認証不要（患者様ご自身のスマホからQR経由でアクセスする）公開エンドポイント。
// 受付PINによる本人確認・総当たり対策・ログインID重複時の挙動を検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type SettingsRow = { signup_pin: string | null; signup_pin_failed_attempts: number; signup_pin_locked_until: string | null } | null;
let settingsRow: SettingsRow = null;
let insertError: { code: string; message: string } | null = null;
const updateSpy = vi.fn();
const insertSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'clinic_patient_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: settingsRow, error: null }),
            }),
          }),
          update: (patch: Record<string, unknown>) => {
            updateSpy(patch);
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      if (table === 'patients') {
        return {
          insert: async (row: Record<string, unknown>) => {
            insertSpy(row);
            return { error: insertError };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { POST } = await import('./route');

function joinRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/clinics/A000001/join', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ code: 'A000001' });
const validBody = { pin: '123456', name: '山田太郎', loginId: 'yamada01', password: 'password123' };

describe('POST /api/clinics/[code]/join', () => {
  beforeEach(() => {
    settingsRow = null;
    insertError = null;
    updateSpy.mockReset();
    insertSpy.mockReset();
  });

  it('必須項目が不足していれば400', async () => {
    const res = await POST(joinRequest({ pin: '123456' }), { params });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('パスワードが8文字未満なら400', async () => {
    settingsRow = { signup_pin: '123456', signup_pin_failed_attempts: 0, signup_pin_locked_until: null };
    const res = await POST(joinRequest({ ...validBody, password: 'short' }), { params });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('クリニックが自己登録を発行していない（signup_pin未設定）場合は400', async () => {
    settingsRow = { signup_pin: null, signup_pin_failed_attempts: 0, signup_pin_locked_until: null };
    const res = await POST(joinRequest(validBody), { params });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('ロック中は423になり、PINチェックより先に弾かれる', async () => {
    settingsRow = {
      signup_pin: '123456',
      signup_pin_failed_attempts: 5,
      signup_pin_locked_until: new Date(Date.now() + 60_000).toISOString(),
    };
    const res = await POST(joinRequest(validBody), { params });
    expect(res.status).toBe(423);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('PINが違えば401になり、失敗回数を記録する（登録は実行しない）', async () => {
    settingsRow = { signup_pin: '999999', signup_pin_failed_attempts: 2, signup_pin_locked_until: null };
    const res = await POST(joinRequest(validBody), { params });
    expect(res.status).toBe(401);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ signup_pin_failed_attempts: 3 }));
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('PINが正しければ患者を新規登録し、失敗回数をリセットする', async () => {
    settingsRow = { signup_pin: '123456', signup_pin_failed_attempts: 2, signup_pin_locked_until: null };
    const res = await POST(joinRequest(validBody), { params });
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ customer_code: 'A000001', name: '山田太郎', login_id: 'yamada01', status: '有効' }),
    );
    expect(updateSpy).toHaveBeenCalledWith({ signup_pin_failed_attempts: 0, signup_pin_locked_until: null });
  });

  it('ログインIDが重複していれば409で分かりやすいメッセージを返す', async () => {
    settingsRow = { signup_pin: '123456', signup_pin_failed_attempts: 0, signup_pin_locked_until: null };
    insertError = { code: '23505', message: 'duplicate key value violates unique constraint' };
    const res = await POST(joinRequest(validBody), { params });
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toContain('既に使われています');
  });
});
