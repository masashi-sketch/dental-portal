// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

type ThenableResult = { data?: unknown; count?: number | null; error: unknown };

function makeBuilder(result: ThenableResult) {
  const builder = {
    order: () => builder,
    range: () => builder,
    or: () => builder,
    in: () => builder,
    then: (
      resolve: (value: ThenableResult) => void,
      reject?: (reason: unknown) => void,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

let patientsResult: ThenableResult = {
  data: [
    { id: 'p1', customer_code: 'A000001', patient_no: 'T-00001', name: '山田太郎', login_id: 'BU000001', email: null, status: '有効', registered_at: '2026-01-01', created_at: '', updated_at: '', locked_until: null },
  ],
  count: 1,
  error: null,
};
let clinicsResult: ThenableResult = { data: [{ customer_code: 'A000001', name: 'テスト歯科' }], error: null };

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'patients') {
        return { select: () => makeBuilder(patientsResult) };
      }
      if (table === 'clinics') {
        return { select: () => makeBuilder(clinicsResult) };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { GET } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/bgj/patients${query}`);
}

describe('GET /api/bgj/patients', () => {
  beforeEach(() => {
    sessionValue = null;
    patientsResult = {
      data: [
        { id: 'p1', customer_code: 'A000001', patient_no: 'T-00001', name: '山田太郎', login_id: 'BU000001', email: null, status: '有効', registered_at: '2026-01-01', created_at: '', updated_at: '', locked_until: null },
      ],
      count: 1,
      error: null,
    };
    clinicsResult = { data: [{ customer_code: 'A000001', name: 'テスト歯科' }], error: null };
  });

  it('未認証なら401', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('clinicロールは取得不可（401）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('bgjロールなら患者一覧と得意先名を結合して返す', async () => {
    sessionValue = makeSession();
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.patients).toEqual([
      expect.objectContaining({ id: 'p1', name: '山田太郎', login_id: 'BU000001', clinic_name: 'テスト歯科' }),
    ]);
  });

  it('該当する得意先が無ければclinic_nameはnull', async () => {
    sessionValue = makeSession();
    clinicsResult = { data: [], error: null };
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.patients[0].clinic_name).toBeNull();
  });

  it('patientsの取得に失敗したら500', async () => {
    sessionValue = makeSession();
    patientsResult = { data: null, count: null, error: { message: 'db error' } };
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it('pageクエリを指定するとレスポンスのpageに反映される', async () => {
    sessionValue = makeSession();
    const res = await GET(makeRequest('?page=3'));
    const body = await res.json();
    expect(body.page).toBe(3);
  });
});
