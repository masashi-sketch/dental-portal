// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const insertSpy = vi.fn();
const inquiryUpdateSpy = vi.fn();
const insertedReply = {
  id: 'r1',
  inquiry_id: 'inq-1',
  author_name: '営業太郎',
  author_email: 'sales@biogaia.jp',
  body: '確認します',
  created_at: '2026-01-02T00:00:00Z',
};

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'clinic_inquiry_replies') {
        return {
          insert: (row: Record<string, unknown>) => {
            insertSpy(row);
            return { select: () => ({ single: async () => ({ data: insertedReply, error: null }) }) };
          },
        };
      }
      if (table === 'clinic_inquiries') {
        return {
          update: (patch: Record<string, unknown>) => {
            inquiryUpdateSpy(patch);
            return { eq: () => ({ eq: async () => ({ error: null }) }) };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { POST } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'sales@biogaia.jp', name: '営業太郎', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

const params = Promise.resolve({ id: 'inq-1' });

describe('POST /api/bgj/inquiries/[id]/replies', () => {
  beforeEach(() => {
    sessionValue = null;
    insertSpy.mockReset();
    inquiryUpdateSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await POST(makeRequest({ body: '確認します' }), { params });
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('本文が無ければ400', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({}), { params });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('返信を保存し、author_name/author_emailはセッションから自動設定される', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ body: '確認します', authorName: '偽名', authorEmail: 'fake@example.com' }), { params });
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith({
      inquiry_id: 'inq-1',
      author_name: '営業太郎',
      author_email: 'sales@biogaia.jp',
      body: '確認します',
    });
  });

  it('返信するとステータスを対応中に更新する', async () => {
    sessionValue = makeSession();
    await POST(makeRequest({ body: '確認します' }), { params });
    expect(inquiryUpdateSpy).toHaveBeenCalledWith({ status: '対応中' });
  });
});
