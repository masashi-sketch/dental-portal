// @vitest-environment node
// 認証不要（患者様ご自身のスマホからQR経由でアクセスする）公開エンドポイント。
// signup_slugでクリニックを解決すること・受付PINによる本人確認・総当たり対策を
// 検証する。得意先コード（customer_code）はURL・リクエストボディのいずれにも
// 含まれない。ログインIDは手入力させず、DB側の自動採番（'BU'+6桁、生成列）に
// 委ねるため、リクエストボディにも含めない。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type SettingsRow = {
  customer_code: string;
  display_name: string | null;
  patient_background_url: string | null;
  signup_pin: string | null;
  signup_pin_failed_attempts: number;
  signup_pin_locked_until: string | null;
} | null;
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
      if (table === 'clinics') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        };
      }
      if (table === 'clinic_email_templates') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        };
      }
      if (table === 'patient_login_tokens') {
        return { insert: async () => ({ error: null }) };
      }
      if (table === 'patients') {
        return {
          insert: (row: Record<string, unknown>) => {
            insertSpy(row);
            return {
              select: () => ({
                single: async () =>
                  insertError
                    ? { data: null, error: insertError }
                    : { data: { id: 'patient-1', login_id: 'BU000123' }, error: null },
              }),
            };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { GET, POST } = await import('./route');

function joinRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/join/abc123', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ slug: 'abc123' });
const validBody = { pin: '123456', name: '山田太郎', email: 'yamada@example.com', password: 'password123' };

describe('GET/POST /api/join/[slug]', () => {
  beforeEach(() => {
    settingsRow = null;
    insertError = null;
    updateSpy.mockReset();
    insertSpy.mockReset();
  });

  it('GET: 存在しないslugならdisplayName/backgroundUrlともnull', async () => {
    const res = await GET(new NextRequest('http://localhost/api/join/abc123'), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ displayName: null, backgroundUrl: null });
  });

  it('GET: 存在するslugなら表示名・背景画像URLのみ返す（得意先コードは含まない）', async () => {
    settingsRow = {
      customer_code: 'A000001',
      display_name: '中央歯科クリニック',
      patient_background_url: 'https://example.com/bg.jpg',
      signup_pin: '123456',
      signup_pin_failed_attempts: 0,
      signup_pin_locked_until: null,
    };
    const res = await GET(new NextRequest('http://localhost/api/join/abc123'), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ displayName: '中央歯科クリニック', backgroundUrl: 'https://example.com/bg.jpg' });
    expect(JSON.stringify(body)).not.toContain('A000001');
  });

  it('POST: 必須項目が不足していれば400', async () => {
    const res = await POST(joinRequest({ pin: '123456' }), { params });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('POST: メールアドレスが不足していれば400', async () => {
    settingsRow = { customer_code: 'A000001', display_name: null, patient_background_url: null, signup_pin: '123456', signup_pin_failed_attempts: 0, signup_pin_locked_until: null };
    const res = await POST(joinRequest({ pin: validBody.pin, name: validBody.name, password: validBody.password }), { params });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('POST: メールアドレスの形式が不正なら400', async () => {
    settingsRow = { customer_code: 'A000001', display_name: null, patient_background_url: null, signup_pin: '123456', signup_pin_failed_attempts: 0, signup_pin_locked_until: null };
    const res = await POST(joinRequest({ ...validBody, email: 'not-an-email' }), { params });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('POST: パスワードが8文字未満なら400', async () => {
    settingsRow = { customer_code: 'A000001', display_name: null, patient_background_url: null, signup_pin: '123456', signup_pin_failed_attempts: 0, signup_pin_locked_until: null };
    const res = await POST(joinRequest({ ...validBody, password: 'short' }), { params });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('POST: slugが存在しない（signup_pin未設定扱い）場合は400', async () => {
    settingsRow = null;
    const res = await POST(joinRequest(validBody), { params });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('POST: ロック中は423になり、PINチェックより先に弾かれる', async () => {
    settingsRow = {
      customer_code: 'A000001',
      display_name: null,
      patient_background_url: null,
      signup_pin: '123456',
      signup_pin_failed_attempts: 5,
      signup_pin_locked_until: new Date(Date.now() + 60_000).toISOString(),
    };
    const res = await POST(joinRequest(validBody), { params });
    expect(res.status).toBe(423);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('POST: PINが違えば401になり、失敗回数を記録する（登録は実行しない）', async () => {
    settingsRow = { customer_code: 'A000001', display_name: null, patient_background_url: null, signup_pin: '999999', signup_pin_failed_attempts: 2, signup_pin_locked_until: null };
    const res = await POST(joinRequest(validBody), { params });
    expect(res.status).toBe(401);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ signup_pin_failed_attempts: 3 }));
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('POST: PINが正しければ患者を新規登録し、失敗回数をリセットする。DBが自動採番したログインIDを返す', async () => {
    settingsRow = { customer_code: 'A000001', display_name: null, patient_background_url: null, signup_pin: '123456', signup_pin_failed_attempts: 2, signup_pin_locked_until: null };
    const res = await POST(joinRequest(validBody), { params });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.loginId).toBe('BU000123');
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ customer_code: 'A000001', name: '山田太郎', email: 'yamada@example.com', status: '有効' }),
    );
    expect(insertSpy.mock.calls[0][0]).not.toHaveProperty('login_id');
    expect(updateSpy).toHaveBeenCalledWith({ signup_pin_failed_attempts: 0, signup_pin_locked_until: null });
  });

  it('POST: 登録に失敗すれば500', async () => {
    settingsRow = { customer_code: 'A000001', display_name: null, patient_background_url: null, signup_pin: '123456', signup_pin_failed_attempts: 0, signup_pin_locked_until: null };
    insertError = { code: '23505', message: 'some db error' };
    const res = await POST(joinRequest(validBody), { params });
    expect(res.status).toBe(500);
  });
});
