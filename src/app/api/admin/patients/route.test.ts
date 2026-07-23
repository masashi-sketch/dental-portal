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
  headers: async () => new Headers(),
}));

let patientRows: unknown[] = [];
let insertedRow: unknown = { id: 'patient-1' };
const insertSpy = vi.fn();
const eqSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => {
        const query = {
          order: () => ({
            limit: () => query,
          }),
          eq: (...args: unknown[]) => {
            eqSpy(...args);
            return query;
          },
          then: (resolve: (v: { data: unknown; error: null }) => void) =>
            resolve({ data: patientRows, error: null }),
        };
        return query;
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
    ? `http://localhost/api/admin/patients?customerCode=${customerCode}`
    : 'http://localhost/api/admin/patients';
  return new NextRequest(url);
}

function postRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/patients', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('GET /api/admin/patients', () => {
  beforeEach(() => {
    sessionValue = null;
    patientRows = [];
    eqSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await GET(getRequest(null));
    expect(res.status).toBe(401);
  });

  it('clinicロールは自院のcustomer_codeで絞り込む（クエリ指定は無視される）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    await GET(getRequest('A999999'));
    expect(eqSpy).toHaveBeenCalledWith('customer_code', 'A000001');
  });

  it('bgjロールがcustomerCode未指定（cookieも無し）なら400（全件返却しない）', async () => {
    sessionValue = makeSession({ role: 'bgj' });
    const res = await GET(getRequest(null));
    expect(res.status).toBe(400);
    expect(eqSpy).not.toHaveBeenCalled();
  });

  it('bgjロールがcustomerCodeを指定した場合はそのコードで絞り込む', async () => {
    sessionValue = makeSession({ role: 'bgj' });
    await GET(getRequest('A000002'));
    expect(eqSpy).toHaveBeenCalledWith('customer_code', 'A000002');
  });
});

describe('POST /api/admin/patients', () => {
  beforeEach(() => {
    sessionValue = null;
    insertedRow = { id: 'patient-1' };
    insertSpy.mockReset();
  });

  it('未認証なら401（作成しない）', async () => {
    const res = await POST(postRequest({ name: '患者A', password: 'password123' }));
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('必須項目が不足していると400（作成しない）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await POST(postRequest({ name: '', password: 'password123' }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('パスワードが8文字未満だと400（作成しない）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await POST(postRequest({ name: '患者A', password: 'short' }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('作成時はlogin_idを渡さず、password_hashをsalt:hash形式で保存する', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await POST(postRequest({ name: '患者A', password: 'password123' }));
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const insertedArg = insertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(insertedArg).not.toHaveProperty('login_id');
    expect(insertedArg.customer_code).toBe('A000001');
    expect(insertedArg.password_hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });
});
