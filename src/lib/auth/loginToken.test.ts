// @vitest-environment node
// ワンクリックログイン・パスワード再設定トークンの発行・検証・クールダウン。
// 平文がDBに保存されないこと・使い捨て/期限切れ/用途違いの拒否を確認する。
import { beforeEach, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLoginToken, consumeLoginToken, hasRecentLoginToken } from './loginToken';

type Row = {
  id: string;
  patient_id: string;
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
    if (table !== 'patient_login_tokens') throw new Error(`unexpected table: ${table}`);
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

describe('loginToken', () => {
  beforeEach(() => {
    rows = [];
  });

  it('createLoginToken: 平文トークンは返すがDBにはハッシュのみ保存する', async () => {
    const token = await createLoginToken(supabase, 'patient-1', 'first_login');
    expect(token.length).toBeGreaterThan(20);
    expect(rows).toHaveLength(1);
    expect(rows[0].patient_id).toBe('patient-1');
    expect(rows[0].purpose).toBe('first_login');
    expect(rows[0].token_hash).not.toBe(token);
    expect(rows[0].token_hash).not.toContain(token);
  });

  it('consumeLoginToken: 有効なトークンはpatientIdを返し、使用済みにマークする', async () => {
    const token = await createLoginToken(supabase, 'patient-1', 'first_login');
    const result = await consumeLoginToken(supabase, token, 'first_login');
    expect(result).toEqual({ patientId: 'patient-1' });
    expect(rows[0].used_at).not.toBeNull();
  });

  it('consumeLoginToken: 同じトークンの2回目はnull（使い捨て）', async () => {
    const token = await createLoginToken(supabase, 'patient-1', 'first_login');
    await consumeLoginToken(supabase, token, 'first_login');
    expect(await consumeLoginToken(supabase, token, 'first_login')).toBeNull();
  });

  it('consumeLoginToken: 用途が違えばnull（first_loginトークンでパスワード再設定は不可）', async () => {
    const token = await createLoginToken(supabase, 'patient-1', 'first_login');
    expect(await consumeLoginToken(supabase, token, 'password_reset')).toBeNull();
    expect(rows[0].used_at).toBeNull();
  });

  it('consumeLoginToken: 期限切れならnull', async () => {
    const token = await createLoginToken(supabase, 'patient-1', 'first_login');
    rows[0].expires_at = new Date(Date.now() - 60_000).toISOString();
    expect(await consumeLoginToken(supabase, token, 'first_login')).toBeNull();
  });

  it('consumeLoginToken: 存在しないトークンはnull', async () => {
    expect(await consumeLoginToken(supabase, 'no-such-token', 'first_login')).toBeNull();
  });

  it('hasRecentLoginToken: 直近の同一患者・同一用途の発行があればtrue、無関係ならfalse', async () => {
    await createLoginToken(supabase, 'patient-1', 'password_reset');
    expect(await hasRecentLoginToken(supabase, 'patient-1', 'password_reset')).toBe(true);
    expect(await hasRecentLoginToken(supabase, 'patient-1', 'first_login')).toBe(false);
    expect(await hasRecentLoginToken(supabase, 'patient-2', 'password_reset')).toBe(false);
  });

  it('hasRecentLoginToken: クールダウン経過後はfalse', async () => {
    await createLoginToken(supabase, 'patient-1', 'password_reset');
    rows[0].created_at = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(await hasRecentLoginToken(supabase, 'patient-1', 'password_reset')).toBe(false);
  });
});
