// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const insertSpy = vi.fn();
const insertedRow = {
  id: 'status-1',
  name: '活性',
  color: 'emerald',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const listedRows = [insertedRow];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'clinic_statuses') throw new Error(`unexpected table: ${table}`);
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
  return new Request('http://localhost/api/bgj/clinic-statuses', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe('GET /api/bgj/clinic-statuses', () => {
  beforeEach(() => {
    sessionValue = null;
  });

  it('未認証なら401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('clinicロールは取得不可（401）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('bgjロールなら取得できる', async () => {
    sessionValue = makeSession();
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clinicStatuses).toEqual(listedRows);
  });
});

describe('POST /api/bgj/clinic-statuses', () => {
  beforeEach(() => {
    sessionValue = null;
    insertSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await POST(makeRequest({ name: '活性', color: 'emerald' }));
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('ステータス名が無ければ400', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ color: 'emerald' }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('不正な色なら400', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ name: '活性', color: 'rainbow' }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('色未指定ならslateで保存される', async () => {
    sessionValue = makeSession();
    await POST(makeRequest({ name: '活性' }));
    expect(insertSpy).toHaveBeenCalledWith({ name: '活性', color: 'slate' });
  });

  it('bgjロールなら作成できる', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ name: '活性', color: 'emerald' }));
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith({ name: '活性', color: 'emerald' });
  });
});
