// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let inquiryRow: Record<string, unknown> | null = {
  id: 'inq-1',
  customer_code: 'A000001',
  subject: '在庫について',
  body: '在庫が不足しています',
  status: '未対応',
  created_by: '受付太郎',
  slack_notified_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
let clinicRow: { name: string } | null = { name: '中央歯科クリニック' };
let repliesRows: Record<string, unknown>[] = [];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'clinic_inquiries') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: inquiryRow, error: null }) }) }) };
      }
      if (table === 'clinics') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: clinicRow, error: null }) }) }) };
      }
      if (table === 'clinic_inquiry_replies') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: repliesRows, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
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

const params = Promise.resolve({ id: 'inq-1' });

describe('GET /api/bgj/inquiries/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    inquiryRow = {
      id: 'inq-1',
      customer_code: 'A000001',
      subject: '在庫について',
      body: '在庫が不足しています',
      status: '未対応',
      created_by: '受付太郎',
      slack_notified_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    clinicRow = { name: '中央歯科クリニック' };
    repliesRows = [];
  });

  it('未認証なら401', async () => {
    const res = await GET(new Request('http://localhost') as never, { params });
    expect(res.status).toBe(401);
  });

  it('存在しないidなら404', async () => {
    sessionValue = makeSession();
    inquiryRow = null;
    const res = await GET(new Request('http://localhost') as never, { params });
    expect(res.status).toBe(404);
  });

  it('問い合わせ・得意先名・返信一覧を返す', async () => {
    sessionValue = makeSession();
    repliesRows = [
      { id: 'r1', inquiry_id: 'inq-1', author_name: '営業太郎', author_email: 'sales@biogaia.jp', body: '確認します', created_at: '2026-01-02T00:00:00Z' },
    ];
    const res = await GET(new Request('http://localhost') as never, { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.inquiry.clinicName).toBe('中央歯科クリニック');
    expect(body.replies).toHaveLength(1);
    expect(body.replies[0].body).toBe('確認します');
  });
});
