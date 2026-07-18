// @vitest-environment node
// Slack Webhook URLの生値を絶対にレスポンスへ含めないこと（末尾のみのマスク表示）、
// PATCHの空欄送信は既存値を変更しない（誤操作で通知が止まる事故を防ぐ）ことを検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let settingsRow: { id: number; slack_webhook_url: string | null; updated_by: string | null; updated_at: string } = {
  id: 1,
  slack_webhook_url: null,
  updated_by: null,
  updated_at: '2026-01-01T00:00:00Z',
};
const updateSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'app_settings') throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: settingsRow, error: null }),
          }),
        }),
        update: (patch: Record<string, unknown>) => {
          updateSpy(patch);
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  }),
}));

const { GET, PATCH } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/bgj/system/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0];
}

describe('GET /api/bgj/system/settings', () => {
  beforeEach(() => {
    sessionValue = null;
    settingsRow = { id: 1, slack_webhook_url: null, updated_by: null, updated_at: '2026-01-01T00:00:00Z' };
  });

  it('未認証なら401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('未設定ならconfigured:falseを返す', async () => {
    sessionValue = makeSession();
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ configured: false, webhookUrlPreview: null });
  });

  it('設定済みなら末尾のみのマスク表示を返し、生値は含まない', async () => {
    sessionValue = makeSession();
    settingsRow.slack_webhook_url = 'https://hooks.slack.com/services/T000/B000/abcdefghijklmnop';
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.configured).toBe(true);
    expect(body.webhookUrlPreview).toBe('...klmnop');
    expect(JSON.stringify(body)).not.toContain('hooks.slack.com');
  });
});

describe('PATCH /api/bgj/system/settings', () => {
  beforeEach(() => {
    sessionValue = null;
    updateSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await PATCH(makeRequest({ webhookUrl: 'https://hooks.slack.com/services/x' }));
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('webhookUrlを渡すとslack_webhook_urlが更新される', async () => {
    sessionValue = makeSession();
    const res = await PATCH(makeRequest({ webhookUrl: 'https://hooks.slack.com/services/new' }));
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ slack_webhook_url: 'https://hooks.slack.com/services/new', updated_by: 'staff@biogaia.jp' }),
    );
  });

  it('空欄送信では既存値を変更しない（slack_webhook_urlキーを含めない）', async () => {
    sessionValue = makeSession();
    await PATCH(makeRequest({ webhookUrl: '' }));
    expect(updateSpy).toHaveBeenCalledWith({ updated_by: 'staff@biogaia.jp' });
  });
});
