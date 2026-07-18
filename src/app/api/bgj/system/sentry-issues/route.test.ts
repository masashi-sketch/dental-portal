// @vitest-environment node
// Sentry Auth Tokenの実際の値やイベント内容は一切扱わず、Sentry APIから返る
// 未解決issue一覧を認証済みBGJ職員にのみ中継するルート。トークン未設定時は
// エラーではなく{configured:false}を返す（アプリ管理画面で穏やかに表示するため）。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const fetchMock = vi.fn();

const { GET } = await import('./route');

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('GET /api/bgj/system/sentry-issues', () => {
  beforeEach(() => {
    sessionValue = null;
    vi.unstubAllEnvs();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('未認証なら401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('SENTRY_AUTH_TOKEN未設定ならconfigured:falseを返す（エラーにしない）', async () => {
    sessionValue = makeSession({});
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ configured: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Sentry APIが200なら未解決issue一覧を返す', async () => {
    sessionValue = makeSession({});
    vi.stubEnv('SENTRY_AUTH_TOKEN', 'sntryu_dummy');
    const issues = [
      { id: '1', shortId: 'DP-1', title: 'TypeError: x is not a function', culprit: 'page.tsx', level: 'error', count: '12', lastSeen: '2026-07-18T00:00:00Z', permalink: 'https://biogaiajp.sentry.io/issues/1/' },
    ];
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => issues });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ configured: true, unresolvedCount: 1, issues });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('organizations/biogaiajp/issues');
    expect(calledUrl).toContain('project=4511754532552704');
    const calledInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect((calledInit.headers as Record<string, string>).Authorization).toBe('Bearer sntryu_dummy');
  });

  it('Sentry APIが401ならトークン無効メッセージを返す（例外を投げない）', async () => {
    sessionValue = makeSession({});
    vi.stubEnv('SENTRY_AUTH_TOKEN', 'sntryu_dummy');
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ configured: true, error: 'Sentryのトークンが無効です' });
  });

  it('fetch自体が失敗しても例外を投げず接続エラーを返す', async () => {
    sessionValue = makeSession({});
    vi.stubEnv('SENTRY_AUTH_TOKEN', 'sntryu_dummy');
    fetchMock.mockRejectedValue(new Error('network down'));
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ configured: true, error: 'Sentry APIへの接続に失敗しました' });
  });
});
