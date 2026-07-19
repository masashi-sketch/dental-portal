// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

// 各count系クエリはSupabaseのPostgrestFilterBuilder同様、chainメソッド呼び出しの
// どの段階でもawait可能（thenable）。呼び出し順に応じて事前に用意した値を1つずつ返す。
type ThenableResult = { data?: unknown; count?: number | null; error: unknown };

function makeBuilder(result: ThenableResult) {
  const builder = {
    eq: () => builder,
    gt: () => builder,
    is: () => builder,
    not: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (
      resolve: (value: ThenableResult) => void,
      reject?: (reason: unknown) => void,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

const statusesData = [
  { id: 'status-1', name: '活性', color: 'emerald', created_at: '', updated_at: '' },
  { id: 'status-2', name: '休眠', color: 'amber', created_at: '', updated_at: '' },
];

// クエリ発行順（route.ts内のPromise.all配列の並び）に対応する値。
// clinics: 合計 → 未設定 → ステータス別（status-1, status-2の順）
let clinicCounts: (number | null)[] = [10, 2, 7, 1];
let clinicUserCounts: (number | null)[] = [50, 45, 3];
let patientCounts: (number | null)[] = [500, 480, 5, 300];
let inquiriesCounts: (number | null)[] = [4];
let clinicError: { message: string } | null = null;

let clinicCallIndex = 0;
let clinicUserCallIndex = 0;
let patientCallIndex = 0;
let inquiriesCallIndex = 0;

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'clinic_statuses') {
        return { select: () => makeBuilder({ data: statusesData, error: null }) };
      }
      if (table === 'clinics') {
        return {
          select: () => {
            if (clinicError) return makeBuilder({ count: null, error: clinicError });
            return makeBuilder({ count: clinicCounts[clinicCallIndex++], error: null });
          },
        };
      }
      if (table === 'clinic_users') {
        return {
          select: () => makeBuilder({ count: clinicUserCounts[clinicUserCallIndex++], error: null }),
        };
      }
      if (table === 'patients') {
        return {
          select: () => makeBuilder({ count: patientCounts[patientCallIndex++], error: null }),
        };
      }
      if (table === 'clinic_inquiries') {
        return {
          select: () => makeBuilder({ count: inquiriesCounts[inquiriesCallIndex++], error: null }),
        };
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

describe('GET /api/bgj/system/dashboard', () => {
  beforeEach(() => {
    sessionValue = null;
    clinicCounts = [10, 2, 7, 1];
    clinicUserCounts = [50, 45, 3];
    patientCounts = [500, 480, 5, 300];
    inquiriesCounts = [4];
    clinicError = null;
    clinicCallIndex = 0;
    clinicUserCallIndex = 0;
    patientCallIndex = 0;
    inquiriesCallIndex = 0;
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

  it('bgjロールなら各KPIの集計結果を返す', async () => {
    sessionValue = makeSession();
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.clinics).toEqual({
      total: 10,
      unset: 2,
      byStatus: [
        { id: 'status-1', name: '活性', color: 'emerald', count: 7 },
        { id: 'status-2', name: '休眠', color: 'amber', count: 1 },
      ],
    });
    expect(body.clinicUsers).toEqual({ total: 50, active: 45, locked: 3 });
    expect(body.patients).toEqual({ total: 500, active: 480, locked: 5, qrRegistered: 300 });
    expect(body.inquiries).toEqual({ open: 4 });
  });

  it('集計クエリの一部がエラーなら500', async () => {
    sessionValue = makeSession();
    clinicError = { message: 'db error' };
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
