// @vitest-environment node
// クリニック自身の問い合わせ送信専用ルート。他院のcustomer_codeを騙って送信できない
// こと、Slack通知が失敗しても問い合わせ自体の登録は成功すること（ベストエフォート）
// を検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const fetchMock = vi.fn();

const insertedInquiry = {
  id: 'inq-1',
  customer_code: 'A000001',
  subject: '在庫について',
  body: '在庫が不足しています',
  status: '未対応',
  created_by: '受付太郎',
  slack_notified_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const insertSpy = vi.fn();
const updateSpy = vi.fn();
let settingsRow: { slack_webhook_url: string | null } = { slack_webhook_url: 'https://hooks.slack.com/services/x' };
let clinicRow: { name: string; staff_id: string | null } | null = { name: '中央歯科クリニック', staff_id: 'rep-1' };
let staffRow: { name: string; slack_user_id: string | null } | null = { name: '営業太郎', slack_user_id: 'U0123ABCD' };

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'clinic_inquiries') {
        return {
          insert: (row: Record<string, unknown>) => {
            insertSpy(row);
            return { select: () => ({ single: async () => ({ data: insertedInquiry, error: null }) }) };
          },
          update: (patch: Record<string, unknown>) => {
            updateSpy(patch);
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      if (table === 'app_settings') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: settingsRow, error: null }) }) }) };
      }
      if (table === 'clinics') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: clinicRow, error: null }) }) }) };
      }
      if (table === 'sales_reps') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: staffRow, error: null }) }) }) };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { POST } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'clinic', customerCode: 'A000001', patientId: null, name: '受付太郎', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequestLike(body);
}

class NextRequestLike {
  private _body: Record<string, unknown>;
  constructor(body: Record<string, unknown>) {
    this._body = body;
  }
  async json() {
    return this._body;
  }
}

describe('POST /api/admin/inquiries', () => {
  beforeEach(() => {
    sessionValue = null;
    insertSpy.mockReset();
    updateSpy.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    settingsRow = { slack_webhook_url: 'https://hooks.slack.com/services/x' };
    clinicRow = { name: '中央歯科クリニック', staff_id: 'rep-1' };
    staffRow = { name: '営業太郎', slack_user_id: 'U0123ABCD' };
  });

  it('未認証（clinicロールでない）なら401', async () => {
    sessionValue = { user: { role: 'bgj', customerCode: null, patientId: null }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    const res = await POST(makeRequest({ subject: 'x', body: 'y' }) as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('件名・本文が無ければ400', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ subject: '' }) as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('自分のcustomerCodeで登録され、bodyのcustomerCode指定は無視される', async () => {
    sessionValue = makeSession();
    const res = await POST(
      makeRequest({ subject: '在庫について', body: '在庫が不足しています', customerCode: 'B999999' }) as unknown as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ customer_code: 'A000001', subject: '在庫について', created_by: '受付太郎' }),
    );
  });

  it('Slack Webhookへ医院名・担当者メンション・返信URLを含めて通知する', async () => {
    sessionValue = makeSession();
    await POST(makeRequest({ subject: '在庫について', body: '在庫が不足しています' }) as unknown as Parameters<typeof POST>[0]);
    expect(fetchMock).toHaveBeenCalledWith('https://hooks.slack.com/services/x', expect.any(Object));
    const sentText = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).text as string;
    expect(sentText).toContain('中央歯科クリニック');
    expect(sentText).toContain('<@U0123ABCD>');
    expect(sentText).toContain('/bgj/inquiries/inq-1');
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ slack_notified_at: expect.any(String) }));
  });

  it('Webhook URL未設定ならSlack送信をスキップし、問い合わせ登録は成功する', async () => {
    sessionValue = makeSession();
    settingsRow = { slack_webhook_url: null };
    const res = await POST(makeRequest({ subject: '在庫について', body: '在庫が不足しています' }) as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(201);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Slack送信が失敗しても問い合わせ登録は成功する（ベストエフォート）', async () => {
    sessionValue = makeSession();
    fetchMock.mockRejectedValue(new Error('network down'));
    const res = await POST(makeRequest({ subject: '在庫について', body: '在庫が不足しています' }) as unknown as Parameters<typeof POST>[0]);
    const jsonBody = await res.json();
    expect(res.status).toBe(201);
    expect(jsonBody.inquiry.id).toBe('inq-1');
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
