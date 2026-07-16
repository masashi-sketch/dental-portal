import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

// 総当たり対策：この回数連続で失敗するとロックする
const LOCKOUT_THRESHOLD = 5;
// ロックする時間（分）
const LOCKOUT_MINUTES = 15;

export function isLocked(lockedUntil: string | null): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > Date.now();
}

export async function recordFailedLoginAttempt(
  supabase: SupabaseClient,
  table: 'patients' | 'clinic_users',
  id: string,
  currentAttempts: number,
): Promise<void> {
  const nextAttempts = currentAttempts + 1;
  const lockedUntil =
    nextAttempts >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null;

  await supabase
    .from(table)
    .update({ failed_login_attempts: nextAttempts, locked_until: lockedUntil })
    .eq('id', id);
}

export async function resetLoginAttempts(
  supabase: SupabaseClient,
  table: 'patients' | 'clinic_users',
  id: string,
): Promise<void> {
  await supabase.from(table).update({ failed_login_attempts: 0, locked_until: null }).eq('id', id);
}
