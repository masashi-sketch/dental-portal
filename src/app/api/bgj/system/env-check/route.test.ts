// @vitest-environment node
// env-checkルートは環境変数の設定有無（真偽値）のみを返す想定。
// 値そのものが絶対にレスポンスへ混入しないことを検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const { GET } = await import('./route');

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('GET /api/bgj/system/env-check', () => {
  beforeEach(() => {
    sessionValue = null;
    vi.unstubAllEnvs();
  });

  it('未認証なら401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('clinicロールは403相当（401）で拒否される', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('bgjロールなら設定有無の一覧を返す', async () => {
    sessionValue = makeSession({});
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.envVars)).toBe(true);
    const supabaseUrl = body.envVars.find((v: { name: string }) => v.name === 'SUPABASE_URL');
    const sentryDsn = body.envVars.find((v: { name: string }) => v.name === 'NEXT_PUBLIC_SENTRY_DSN');
    expect(supabaseUrl.configured).toBe(true);
    expect(sentryDsn.configured).toBe(false);
  });

  it('レスポンスに実際の環境変数の値が一切含まれない', async () => {
    sessionValue = makeSession({});
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'super-secret-value-should-not-leak');
    const res = await GET();
    const body = await res.json();
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('super-secret-value-should-not-leak');
    for (const entry of body.envVars) {
      expect(Object.keys(entry).sort()).toEqual(['configured', 'name']);
    }
  });
});
