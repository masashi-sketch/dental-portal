// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const updateSpy = vi.fn();
const updatedRow = {
  id: 'rep-1',
  name: '山田太郎',
  role_id: null,
  area_id: null,
  phone: null,
  email: null,
  photo_url: null,
  slack_user_id: 'U9999ZZZZ',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'sales_reps') throw new Error(`unexpected table: ${table}`);
      return {
        update: (patch: Record<string, unknown>) => {
          updateSpy(patch);
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({ data: updatedRow, error: null }),
              }),
            }),
          };
        },
      };
    },
  }),
}));

const { PATCH } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/bgj/sales-reps/rep-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0];
}

const params = Promise.resolve({ id: 'rep-1' });

describe('PATCH /api/bgj/sales-reps/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    updateSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await PATCH(makeRequest({ slackUserId: 'U9999ZZZZ' }), { params });
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('slackUserIdを渡すとupdateペイロードに含まれる', async () => {
    sessionValue = makeSession();
    const res = await PATCH(makeRequest({ slackUserId: 'U9999ZZZZ' }), { params });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ slack_user_id: 'U9999ZZZZ' }));
  });

  it('slackUserIdを空文字で送るとnullに変換される', async () => {
    sessionValue = makeSession();
    await PATCH(makeRequest({ slackUserId: '' }), { params });
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ slack_user_id: null }));
  });

  it('slackUserId未指定ならupdateペイロードに含まれない（他フィールドのみ変更）', async () => {
    sessionValue = makeSession();
    await PATCH(makeRequest({ name: '新しい名前' }), { params });
    expect(updateSpy).toHaveBeenCalledWith({ name: '新しい名前' });
  });
});
