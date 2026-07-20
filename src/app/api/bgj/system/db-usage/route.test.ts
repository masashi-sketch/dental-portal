// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let totalBytesResult: { data: number | null; error: { message: string } | null } = { data: 123456, error: null };
let tablesResult: { data: unknown[] | null; error: { message: string } | null } = {
  data: [{ table: 'clinics', bytes: 1000 }],
  error: null,
};

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    rpc: (fn: string) => {
      if (fn === 'bgj_db_total_size') return Promise.resolve(totalBytesResult);
      if (fn === 'bgj_db_table_usage') return Promise.resolve(tablesResult);
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

const { GET } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('GET /api/bgj/system/db-usage', () => {
  beforeEach(() => {
    sessionValue = null;
    totalBytesResult = { data: 123456, error: null };
    tablesResult = { data: [{ table: 'clinics', bytes: 1000 }], error: null };
  });

  it('未認証なら401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('clinicロールは401（BGJ専用）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('DB全体サイズとテーブル別使用量を返す', async () => {
    sessionValue = makeSession();
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ totalBytes: 123456, tables: [{ table: 'clinics', bytes: 1000 }] });
  });

  it('片方のRPCが失敗すると500を返す', async () => {
    sessionValue = makeSession();
    totalBytesResult = { data: null, error: { message: 'rpc failed' } };
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
