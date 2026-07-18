// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const insertSpy = vi.fn();
const insertedRow = {
  id: 'link-1',
  label: 'BiogaiaAcademy',
  url: 'https://biogaia-academy.jp/',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const listedRows = [insertedRow];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'bgj_external_links') throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          order: () => ({
            limit: async () => ({ data: listedRows, error: null }),
          }),
        }),
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

const { GET, POST } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/bgj/external-links', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe('GET /api/bgj/external-links', () => {
  beforeEach(() => {
    sessionValue = null;
  });

  it('未認証なら401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('clinicロールでも取得できる（医院用ポータルのLINKS欄で使用）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.externalLinks).toEqual(listedRows);
  });
});

describe('POST /api/bgj/external-links', () => {
  beforeEach(() => {
    sessionValue = null;
    insertSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await POST(makeRequest({ label: 'BiogaiaAcademy', url: 'https://biogaia-academy.jp/' }));
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('clinicロールは書き込み不可（401）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await POST(makeRequest({ label: 'BiogaiaAcademy', url: 'https://biogaia-academy.jp/' }));
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('表示名称かリンクURLが無ければ400', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ label: 'BiogaiaAcademy' }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('bgjロールなら作成できる', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ label: 'BiogaiaAcademy', url: 'https://biogaia-academy.jp/' }));
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith({ label: 'BiogaiaAcademy', url: 'https://biogaia-academy.jp/' });
  });
});
