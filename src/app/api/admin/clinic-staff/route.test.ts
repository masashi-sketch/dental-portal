// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
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

let staffRows: unknown[] = [];
let insertedRow: unknown = { id: 'staff-1' };
const insertSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: (columns: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.head) {
          return { eq: async () => ({ count: staffRows.length }) };
        }
        return {
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: staffRows, error: null }),
            }),
          }),
        };
      },
      insert: (row: Record<string, unknown>) => {
        insertSpy(row);
        return {
          select: () => ({
            single: async () => ({ data: insertedRow, error: null }),
          }),
        };
      },
    }),
  }),
}));

const { GET, POST } = await import('./route');

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function getRequest(customerCode: string | null) {
  const url = customerCode
    ? `http://localhost/api/admin/clinic-staff?customerCode=${customerCode}`
    : 'http://localhost/api/admin/clinic-staff';
  return new NextRequest(url);
}

function postRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/clinic-staff', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('GET /api/admin/clinic-staff', () => {
  beforeEach(() => {
    sessionValue = null;
    staffRows = [];
  });

  it('未認証なら401', async () => {
    const res = await GET(getRequest(null));
    expect(res.status).toBe(401);
  });

  it('clinicロールは自院のスタッフを返す（クエリのcustomerCodeは無視される）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    staffRows = [{ id: 'staff-1', customer_code: 'A000001' }];
    const res = await GET(getRequest('A999999'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.staff).toEqual(staffRows);
  });

  it('bgjロールがcustomerCodeを指定しないと空配列を返す', async () => {
    sessionValue = makeSession({ role: 'bgj' });
    const res = await GET(getRequest(null));
    const body = await res.json();
    expect(body).toEqual({ staff: [] });
  });
});

describe('POST /api/admin/clinic-staff', () => {
  beforeEach(() => {
    sessionValue = null;
    staffRows = [];
    insertedRow = { id: 'staff-1' };
    insertSpy.mockReset();
  });

  it('未認証なら401（作成しない）', async () => {
    const res = await POST(postRequest({ roleLabel: '院長', name: '山田太郎' }));
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('必須項目が不足していると400（作成しない）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await POST(postRequest({ roleLabel: '院長', name: '' }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('clinicロールが作成すると自院のcustomer_codeで登録される', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await POST(postRequest({ roleLabel: '院長', name: '山田太郎', credentials: '歯科医師' }));
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ customer_code: 'A000001', role_label: '院長', name: '山田太郎', credentials: '歯科医師' }),
    );
  });
});
