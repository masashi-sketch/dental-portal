// @vitest-environment node
// 医院用ポータル（自院固定）とBGJポータル（customerCode指定の代理編集）の両方から
// 使われるルート。clinicロールが他院のcustomerCodeを指定しても無視されることを検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

// resolveScopedCustomerCodeがbgjロール・customerCode未指定時に読むcookie。
// このテストではcookieも無い状態（=undefined）を再現する。
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

const insertSpy = vi.fn();
const insertedRow = {
  id: 'ann-1',
  customer_code: 'A000001',
  announcement_date: '2026-07-01',
  tag: 'お知らせ',
  text: '休診日のお知らせです',
  status: '公開',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};
let listRows: Record<string, unknown>[] = [];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'clinic_announcements') throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: listRows, error: null }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          insertSpy(row);
          return { select: () => ({ single: async () => ({ data: insertedRow, error: null }) }) };
        },
      };
    },
  }),
}));

const { GET, POST } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'clinic', customerCode: 'A000001', patientId: null, ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeGetRequest(url: string) {
  return { nextUrl: new URL(url) } as unknown as Parameters<typeof GET>[0];
}

function makePostRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

describe('GET /api/admin/clinic-announcements', () => {
  beforeEach(() => {
    sessionValue = null;
    listRows = [];
  });

  it('未認証なら401', async () => {
    const res = await GET(makeGetRequest('http://localhost/api/admin/clinic-announcements'));
    expect(res.status).toBe(401);
  });

  it('clinicロールは自院のお知らせ一覧を返す', async () => {
    sessionValue = makeSession();
    listRows = [insertedRow];
    const res = await GET(makeGetRequest('http://localhost/api/admin/clinic-announcements'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.announcements).toEqual([insertedRow]);
  });

  it('customerCode未解決（BGJがクエリ指定なし）なら空配列', async () => {
    sessionValue = { user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    const res = await GET(makeGetRequest('http://localhost/api/admin/clinic-announcements'));
    const body = await res.json();
    expect(body.announcements).toEqual([]);
  });
});

describe('POST /api/admin/clinic-announcements', () => {
  beforeEach(() => {
    sessionValue = null;
    insertSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await POST(makePostRequest({ text: 'x' }));
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('本文が無ければ400', async () => {
    sessionValue = makeSession();
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('clinicロールは自院のcustomerCodeに固定して登録する（bodyのcustomerCode指定は無視）', async () => {
    sessionValue = makeSession();
    const res = await POST(
      makePostRequest({ text: '休診日のお知らせです', tag: '重要', announcementDate: '2026-07-01', customerCode: 'B999999' }),
    );
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ customer_code: 'A000001', text: '休診日のお知らせです', tag: '重要' }),
    );
  });

  it('statusとtag未指定時はデフォルト値になる', async () => {
    sessionValue = makeSession();
    await POST(makePostRequest({ text: '本文のみ' }));
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: '公開', tag: undefined }),
    );
  });
});
