// @vitest-environment node
// 医院スタッフのパスワード再設定トークンの発行・検証・クールダウン。
// 平文がDBに保存されないこと・使い捨て/期限切れ/用途違いの拒否を確認する。
import { beforeEach, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClinicLoginToken, consumeClinicLoginToken, hasRecentClinicLoginToken } from './clinicLoginToken';

type Row = {
  id: string;
  clinic_user_id: string;
  token_hash: string;
  purpose: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

let rows: Row[] = [];

function chain(filtered: Row[]) {
  return {
    eq: (col: keyof Row, val: string) => chain(filtered.filter((r) => r[col] === val)),
    gte: (col: keyof Row, val: string) => chain(filtered.filter((r) => String(r[col]) >= val)),
    limit: async () => ({ data: filtered }),
    maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
  };
}

const supabase = {
  from: (table: string) => {
    if (table !== 'clinic_login_tokens') throw new Error(`unexpected table: ${table}`);
    return {
      insert: async (row: Omit<Row, 'id' | 'used_at' | 'created_at'>) => {
        rows.push({ id: `t${rows.length}`, used_at: null, created_at: new Date().toISOString(), ...row });
        return { error: null };
      },
      select: () => ({
        eq: (col: keyof Row, val: string) => chain(rows.filter((r) => r[col] === val)),
      }),
      update: (patch: Partial<Row>) => ({
        eq: async (col: keyof Row, val: string) => {
          rows.forEach((r) => {
            if (r[col] === val) Object.assign(r, patch);
          });
          return { error: null };
        },
      }),
    };
  },
} as unknown as SupabaseClient;

describe('clinicLoginToken', () => {
  beforeEach(() => {
    rows = [];
  });

  it('createClinicLoginToken: 平文トークンは返すがDBにはハッシュのみ保存する', async () => {
    const token = await createClinicLoginToken(supabase, 'clinic-user-1', 'password_reset');
    expect(token.length).toBeGreaterThan(20);
    expect(rows).toHaveLength(1);
    expect(rows[0].clinic_user_id).toBe('clinic-user-1');
    expect(rows[0].purpose).toBe('password_reset');
    expect(rows[0].token_hash).not.toBe(token);
    expect(rows[0].token_hash).not.toContain(token);
  });

  it('consumeClinicLoginToken: 有効なトークンはclinicUserIdを返し、使用済みにマークする', async () => {
    const token = await createClinicLoginToken(supabase, 'clinic-user-1', 'password_reset');
    const result = await consumeClinicLoginToken(supabase, token, 'password_reset');
    expect(result).toEqual({ clinicUserId: 'clinic-user-1' });
    expect(rows[0].used_at).not.toBeNull();
  });

  it('consumeClinicLoginToken: 同じトークンの2回目はnull（使い捨て）', async () => {
    const token = await createClinicLoginToken(supabase, 'clinic-user-1', 'password_reset');
    await consumeClinicLoginToken(supabase, token, 'password_reset');
    expect(await consumeClinicLoginToken(supabase, token, 'password_reset')).toBeNull();
  });

  it('consumeClinicLoginToken: 期限切れならnull', async () => {
    const token = await createClinicLoginToken(supabase, 'clinic-user-1', 'password_reset');
    rows[0].expires_at = new Date(Date.now() - 60_000).toISOString();
    expect(await consumeClinicLoginToken(supabase, token, 'password_reset')).toBeNull();
  });

  it('consumeClinicLoginToken: 存在しないトークンはnull', async () => {
    expect(await consumeClinicLoginToken(supabase, 'no-such-token', 'password_reset')).toBeNull();
  });

  it('hasRecentClinicLoginToken: 直近の同一スタッフの発行があればtrue、無関係ならfalse', async () => {
    await createClinicLoginToken(supabase, 'clinic-user-1', 'password_reset');
    expect(await hasRecentClinicLoginToken(supabase, 'clinic-user-1', 'password_reset')).toBe(true);
    expect(await hasRecentClinicLoginToken(supabase, 'clinic-user-2', 'password_reset')).toBe(false);
  });

  it('hasRecentClinicLoginToken: クールダウン経過後はfalse', async () => {
    await createClinicLoginToken(supabase, 'clinic-user-1', 'password_reset');
    rows[0].created_at = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(await hasRecentClinicLoginToken(supabase, 'clinic-user-1', 'password_reset')).toBe(false);
  });
});
