// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let visitRows: unknown[] = [];
const insertSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: visitRows, error: null }),
          }),
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        insertSpy(row);
        return { select: () => ({ single: async () => ({ data: { id: 'visit-1', ...row }, error: null }) }) };
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
  return new NextRequest('http://localhost/api/bgj/clinics/A000001/visits', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ code: 'A000001' });

describe('GET /api/bgj/clinics/[code]/visits', () => {
  beforeEach(() => {
    sessionValue = null;
    visitRows = [];
  });

  it('未認証なら401', async () => {
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001/visits'), { params });
    expect(res.status).toBe(401);
  });

  it('clinicロールは401（BGJ専用）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001/visits'), { params });
    expect(res.status).toBe(401);
  });

  it('訪問記録一覧を返す', async () => {
    sessionValue = makeSession();
    visitRows = [{ id: 'visit-1', customer_code: 'A000001', purpose: '定期訪問' }];
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001/visits'), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.visits).toEqual(visitRows);
  });
});

describe('POST /api/bgj/clinics/[code]/visits', () => {
  beforeEach(() => {
    sessionValue = null;
    insertSpy.mockReset();
  });

  it('未認証なら401（作成しない）', async () => {
    const res = await POST(postRequest({ purpose: '定期訪問' }), { params });
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('訪問目的が無いと400（作成しない）', async () => {
    sessionValue = makeSession();
    const res = await POST(postRequest({ memo: 'メモのみ' }), { params });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('作成すると得意先コードと担当者メールが記録される', async () => {
    sessionValue = makeSession({ email: 'yamada@biogaia.jp' });
    const res = await POST(postRequest({ purpose: '定期訪問', memo: '在庫確認' }), { params });
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ customer_code: 'A000001', purpose: '定期訪問', memo: '在庫確認', created_by: 'yamada@biogaia.jp' }),
    );
  });
});
