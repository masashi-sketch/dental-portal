// @vitest-environment node
// loginLockout.tsは`import 'server-only'`を含むため、windowが存在しないnode環境で実行する。
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isLocked, recordFailedLoginAttempt, resetLoginAttempts } from './loginLockout';

function makeFakeSupabase() {
  const updateSpy = vi.fn();
  const eqSpy = vi.fn(async () => ({ error: null }));
  const supabase = {
    from: vi.fn(() => ({
      update: (patch: Record<string, unknown>) => {
        updateSpy(patch);
        return { eq: eqSpy };
      },
    })),
  } as unknown as SupabaseClient;
  return { supabase, updateSpy, eqSpy };
}

describe('isLocked', () => {
  it('locked_until が null なら false', () => {
    expect(isLocked(null)).toBe(false);
  });

  it('locked_until が未来の日時なら true', () => {
    expect(isLocked(new Date(Date.now() + 60_000).toISOString())).toBe(true);
  });

  it('locked_until が過去の日時なら false', () => {
    expect(isLocked(new Date(Date.now() - 60_000).toISOString())).toBe(false);
  });
});

describe('recordFailedLoginAttempt', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('しきい値未満なら locked_until を設定せずカウントだけ増やす', async () => {
    const { supabase, updateSpy, eqSpy } = makeFakeSupabase();
    await recordFailedLoginAttempt(supabase, 'patients', 'patient-1', 2);
    expect(updateSpy).toHaveBeenCalledWith({ failed_login_attempts: 3, locked_until: null });
    expect(eqSpy).toHaveBeenCalledWith('id', 'patient-1');
  });

  it('しきい値（5回目）に達すると locked_until を未来の時刻に設定する', async () => {
    const { supabase, updateSpy } = makeFakeSupabase();
    await recordFailedLoginAttempt(supabase, 'clinic_users', 'user-1', 4);
    const patch = updateSpy.mock.calls[0][0] as { failed_login_attempts: number; locked_until: string | null };
    expect(patch.failed_login_attempts).toBe(5);
    expect(patch.locked_until).not.toBeNull();
    expect(new Date(patch.locked_until as string).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('resetLoginAttempts', () => {
  it('failed_login_attemptsとlocked_untilを0/nullにリセットする', async () => {
    const { supabase, updateSpy, eqSpy } = makeFakeSupabase();
    await resetLoginAttempts(supabase, 'patients', 'patient-1');
    expect(updateSpy).toHaveBeenCalledWith({ failed_login_attempts: 0, locked_until: null });
    expect(eqSpy).toHaveBeenCalledWith('id', 'patient-1');
  });
});
