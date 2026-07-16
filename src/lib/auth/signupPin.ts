import 'server-only';
import { randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// 患者様の自己登録（QR + 受付PIN、/join/[signup_slug]）の総当たり対策。
// clinic_patient_settingsはcustomer_codeが主キーのため、loginLockout.tsとは
// 別モジュールとして持つ（対象テーブル・キー列が異なるため）。
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

export function generateSignupPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 得意先コード（連番で推測可能）をURLに一切出さないための、無関係なランダム文字列。
// 得意先コードのような小さな空間の値は、たとえハッシュ化しても全件を先回りで
// ハッシュ化されると簡単に逆引きできてしまうため、ハッシュではなく十分なエントロピーを
// 持つランダム値を都度発行する（PINの再発行と同時に、これも作り直す）。
export function generateSignupSlug(): string {
  return randomBytes(16).toString('base64url');
}

export function isSignupPinLocked(lockedUntil: string | null): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > Date.now();
}

export async function recordFailedSignupPinAttempt(
  supabase: SupabaseClient,
  customerCode: string,
  currentAttempts: number,
): Promise<void> {
  const nextAttempts = currentAttempts + 1;
  const lockedUntil =
    nextAttempts >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null;

  await supabase
    .from('clinic_patient_settings')
    .update({ signup_pin_failed_attempts: nextAttempts, signup_pin_locked_until: lockedUntil })
    .eq('customer_code', customerCode);
}

export async function resetSignupPinAttempts(supabase: SupabaseClient, customerCode: string): Promise<void> {
  await supabase
    .from('clinic_patient_settings')
    .update({ signup_pin_failed_attempts: 0, signup_pin_locked_until: null })
    .eq('customer_code', customerCode);
}
