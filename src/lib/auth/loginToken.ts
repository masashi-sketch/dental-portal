import 'server-only';
import { randomBytes, createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PATIENT_LOGIN_TOKEN_COLUMNS } from '@/lib/supabase/types';
import type { PatientLoginToken } from '@/lib/supabase/types';

// 患者様のワンクリックログイン（初回登録メール）・パスワード再設定メールで使う、
// 使い捨て・期限付きトークンの発行と検証。トークン自体は高エントロピーな
// ランダム値なので、パスワードと違って低速ハッシュ（scrypt等）は不要。
// DB漏洩時に平文が読めないよう、SHA-256でハッシュ化してから保存するだけで十分。
const TOKEN_TTL_MINUTES = 30;
// 同一患者・同一用途への再発行を抑止する間隔（分）。/api/password-reset/requestは
// 認証不要の公開APIのため、これが無いと第三者が実在メールアドレスへ無制限に
// メールを送りつけられてしまう（メール爆撃）。
const RESEND_COOLDOWN_MINUTES = 3;

export type LoginTokenPurpose = PatientLoginToken['purpose'];

// 直近RESEND_COOLDOWN_MINUTES以内に同一患者・同一用途のトークンを発行済みか。
// trueの間は新規発行・メール送信をスキップする（呼び出し側は成功時と同じ
// レスポンスを返し、外部から発行状況を観測できないようにする）。
export async function hasRecentLoginToken(
  supabase: SupabaseClient,
  patientId: string,
  purpose: LoginTokenPurpose,
): Promise<boolean> {
  const since = new Date(Date.now() - RESEND_COOLDOWN_MINUTES * 60_000).toISOString();
  const { data } = await supabase
    .from('patient_login_tokens')
    .select('id')
    .eq('patient_id', patientId)
    .eq('purpose', purpose)
    .gte('created_at', since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createLoginToken(
  supabase: SupabaseClient,
  patientId: string,
  purpose: LoginTokenPurpose,
): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString();

  await supabase.from('patient_login_tokens').insert({
    patient_id: patientId,
    token_hash: hashToken(token),
    purpose,
    expires_at: expiresAt,
  });

  return token;
}

// 有効なトークンなら使用済みにマークしてpatient_idを返す。無効・期限切れ・
// 使用済み・用途不一致のいずれかならnull（呼び出し側でエラー扱いにする）。
export async function consumeLoginToken(
  supabase: SupabaseClient,
  token: string,
  purpose: LoginTokenPurpose,
): Promise<{ patientId: string } | null> {
  const { data, error } = await supabase
    .from('patient_login_tokens')
    .select(PATIENT_LOGIN_TOKEN_COLUMNS)
    .eq('token_hash', hashToken(token))
    .maybeSingle<PatientLoginToken>();

  if (error || !data) return null;
  if (data.purpose !== purpose) return null;
  if (data.used_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  await supabase.from('patient_login_tokens').update({ used_at: new Date().toISOString() }).eq('id', data.id);
  return { patientId: data.patient_id };
}
