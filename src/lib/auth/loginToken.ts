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

export type LoginTokenPurpose = PatientLoginToken['purpose'];

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
