// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let inquiriesRows: Record<string, unknown>[] = [];
let repliesRows: Record<string, unknown>[] = [];
const inSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'clinic_inquiries') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: inquiriesRows, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'clinic_inquiry_replies') {
        return {
          select: () => ({
            in: (col: string, ids: string[]) => {
              inSpy(ids);
              return { order: async () => ({ data: repliesRows, error: null }) };
            },
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

const params = Promise.resolve({ code: 'A000001' });

describe('GET /api/bgj/clinics/[code]/inquiries', () => {
  beforeEach(() => {
    sessionValue = null;
    inquiriesRows = [];
    repliesRows = [];
    inSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await GET(new Request('http://localhost') as never, { params });
    expect(res.status).toBe(401);
  });

  it('問い合わせが0件ならreplies取得（in句）を呼ばずに空配列を返す', async () => {
    sessionValue = makeSession();
    const res = await GET(new Request('http://localhost') as never, { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.inquiries).toEqual([]);
    expect(inSpy).not.toHaveBeenCalled();
  });

  it('各問い合わせに対応するrepliesをネストして返す', async () => {
    sessionValue = makeSession();
    inquiriesRows = [
      { id: 'inq-1', customer_code: 'A000001', subject: 'A', body: 'a', status: '未対応', created_by: null, slack_notified_at: null, created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
      { id: 'inq-2', customer_code: 'A000001', subject: 'B', body: 'b', status: '完了', created_by: null, slack_notified_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ];
    repliesRows = [
      { id: 'r1', inquiry_id: 'inq-1', author_name: '営業太郎', author_email: 'sales@biogaia.jp', body: '対応します', created_at: '2026-01-03T00:00:00Z' },
    ];
    const res = await GET(new Request('http://localhost') as never, { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(inSpy).toHaveBeenCalledWith(['inq-1', 'inq-2']);
    expect(body.inquiries[0].id).toBe('inq-1');
    expect(body.inquiries[0].replies).toHaveLength(1);
    expect(body.inquiries[1].id).toBe('inq-2');
    expect(body.inquiries[1].replies).toHaveLength(0);
  });
});
