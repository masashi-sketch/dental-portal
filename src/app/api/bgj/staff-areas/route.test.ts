// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let areaRows: unknown[] = [];
const insertSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: async () => ({ data: areaRows, error: null }),
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        insertSpy(row);
        return { select: () => ({ single: async () => ({ data: { id: 'area-1', ...row }, error: null }) }) };
      },
    }),
  }),
}));

const { GET, POST } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function postRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/bgj/staff-areas', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('GET /api/bgj/staff-areas', () => {
  beforeEach(() => {
    sessionValue = null;
    areaRows = [];
  });

  it('未認証なら401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('clinicロールは401（BGJ専用）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('エリア一覧を返す', async () => {
    sessionValue = makeSession();
    areaRows = [{ id: 'area-1', name: '東京都' }];
    const res = await GET();
    const body = await res.json();
    expect(body.staffAreas).toEqual(areaRows);
  });
});

describe('POST /api/bgj/staff-areas', () => {
  beforeEach(() => {
    sessionValue = null;
    insertSpy.mockReset();
  });

  it('未認証なら401（作成しない）', async () => {
    const res = await POST(postRequest({ name: '東京都' }));
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('エリア名が無いと400（作成しない）', async () => {
    sessionValue = makeSession();
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('作成できる', async () => {
    sessionValue = makeSession();
    const res = await POST(postRequest({ name: '東京都' }));
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith({ name: '東京都' });
  });
});
