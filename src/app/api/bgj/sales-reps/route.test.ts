// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const insertSpy = vi.fn();
const insertedRow = {
  id: 'rep-1',
  name: '山田太郎',
  role_id: null,
  area_id: null,
  phone: null,
  email: null,
  photo_url: null,
  slack_user_id: 'U0123ABCD',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'sales_reps') throw new Error(`unexpected table: ${table}`);
      return {
        insert: (row: Record<string, unknown>) => {
          insertSpy(row);
          return {
            select: () => ({
              single: async () => ({ data: insertedRow, error: null }),
            }),
          };
        },
      };
    },
  }),
}));

const { POST } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/bgj/sales-reps', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/bgj/sales-reps', () => {
  beforeEach(() => {
    sessionValue = null;
    insertSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await POST(makeRequest({ name: '山田太郎' }));
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('氏名が無ければ400', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ slackUserId: 'U0123ABCD' }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('slackUserIdを渡すとinsertペイロードに含まれる', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ name: '山田太郎', slackUserId: 'U0123ABCD' }));
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ slack_user_id: 'U0123ABCD' }));
  });

  it('slackUserId未指定ならnullで保存される', async () => {
    sessionValue = makeSession();
    await POST(makeRequest({ name: '山田太郎' }));
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ slack_user_id: null }));
  });
});
