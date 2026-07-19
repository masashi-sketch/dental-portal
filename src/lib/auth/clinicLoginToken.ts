import 'server-only';
import { randomBytes, createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CLINIC_LOGIN_TOKEN_COLUMNS } from '@/lib/supabase/types';
import type { ClinicLoginToken } from '@/lib/supabase/types';

// 医院スタッフのパスワード再設定メールで使う、使い捨て・期限付きトークンの
// 発行と検証。src/lib/auth/loginToken.ts（患者様用）と同じ設計をclinic_users向けに
// 複製したもの（テーブル・FK列が異なるためロジックの共有はせず並行モジュールとする）。
const TOKEN_TTL_MINUTES = 30;
// 同一スタッフへの再発行を抑止する間隔（分）。/api/clinic-password-reset/requestは
// 認証不要の公開APIのため、これが無いと第三者が実在メールアドレスへ無制限に
// メールを送りつけられてしまう（メール爆撃）。
const RESEND_COOLDOWN_MINUTES = 3;

export type ClinicLoginTokenPurpose = ClinicLoginToken['purpose'];

// 直近RESEND_COOLDOWN_MINUTES以内に同一スタッフへトークンを発行済みか。
// trueの間は新規発行・メール送信をスキップする（呼び出し側は成功時と同じ
// レスポンスを返し、外部から発行状況を観測できないようにする）。
export async function hasRecentClinicLoginToken(
  supabase: SupabaseClient,
  clinicUserId: string,
  purpose: ClinicLoginTokenPurpose,
): Promise<boolean> {
  const since = new Date(Date.now() - RESEND_COOLDOWN_MINUTES * 60_000).toISOString();
  const { data } = await supabase
    .from('clinic_login_tokens')
    .select('id')
    .eq('clinic_user_id', clinicUserId)
    .eq('purpose', purpose)
    .gte('created_at', since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createClinicLoginToken(
  supabase: SupabaseClient,
  clinicUserId: string,
  purpose: ClinicLoginTokenPurpose,
): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString();

  await supabase.from('clinic_login_tokens').insert({
    clinic_user_id: clinicUserId,
    token_hash: hashToken(token),
    purpose,
    expires_at: expiresAt,
  });

  return token;
}

// 有効なトークンなら使用済みにマークしてclinic_user_idを返す。無効・期限切れ・
// 使用済み・用途不一致のいずれかならnull（呼び出し側でエラー扱いにする）。
export async function consumeClinicLoginToken(
  supabase: SupabaseClient,
  token: string,
  purpose: ClinicLoginTokenPurpose,
): Promise<{ clinicUserId: string } | null> {
  const { data, error } = await supabase
    .from('clinic_login_tokens')
    .select(CLINIC_LOGIN_TOKEN_COLUMNS)
    .eq('token_hash', hashToken(token))
    .maybeSingle<ClinicLoginToken>();

  if (error || !data) return null;
  if (data.purpose !== purpose) return null;
  if (data.used_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  await supabase.from('clinic_login_tokens').update({ used_at: new Date().toISOString() }).eq('id', data.id);
  return { clinicUserId: data.clinic_user_id };
}
