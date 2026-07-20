// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const clinics = [
  { customer_code: 'A000001', name: '得意先1', staff_id: 'rep-1', status_id: 'status-1' },
  { customer_code: 'A000002', name: '得意先2', staff_id: null, status_id: null },
];
const orderSummary = [{ customer_code: 'A000001', last_order_date: '2026-07-01', month_sales: 5000 }];
const salesReps = [{ id: 'rep-1', name: '営業太郎', role_id: 'role-1', area_id: null }];
const roles = [{ id: 'role-1', name: '営業' }];
const areas: unknown[] = [];
const statuses = [{ id: 'status-1', name: '活性', color: 'emerald' }];

const insertSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      const tableData: Record<string, unknown[]> = { clinics, sales_reps: salesReps, staff_roles: roles, staff_areas: areas, clinic_statuses: statuses };
      return {
        select: () => ({
          order: () => ({ limit: async () => ({ data: tableData[table], error: null }) }),
          limit: async () => ({ data: tableData[table], error: null }),
        }),
        insert: (row: Record<string, unknown>) => {
          insertSpy(row);
          return { select: () => ({ single: async () => ({ data: { ...row }, error: null }) }) };
        },
      };
    },
    rpc: async () => ({ data: orderSummary, error: null }),
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
  return new NextRequest('http://localhost/api/bgj/clinics', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('GET /api/bgj/clinics', () => {
  beforeEach(() => {
    sessionValue = null;
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

  it('得意先ごとに担当営業・ステータス・当月売上・最終注文日をマージして返す', async () => {
    sessionValue = makeSession();
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.clinics).toEqual([
      expect.objectContaining({
        customer_code: 'A000001',
        month_sales: 5000,
        last_order_date: '2026-07-01',
        staff: expect.objectContaining({ id: 'rep-1', name: '営業太郎', role: { id: 'role-1', name: '営業' }, area: null }),
        status: { id: 'status-1', name: '活性', color: 'emerald' },
      }),
      expect.objectContaining({
        customer_code: 'A000002',
        month_sales: 0,
        last_order_date: null,
        staff: null,
        status: null,
      }),
    ]);
  });
});

describe('POST /api/bgj/clinics', () => {
  beforeEach(() => {
    sessionValue = null;
    insertSpy.mockReset();
  });

  it('未認証なら401（作成しない）', async () => {
    const res = await POST(postRequest({ customerCode: 'A000003', name: '新規医院', area: '東京都' }));
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('必須項目が不足していると400（作成しない）', async () => {
    sessionValue = makeSession();
    const res = await POST(postRequest({ customerCode: 'A000003', name: '' }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('必須項目が揃っていれば作成できる', async () => {
    sessionValue = makeSession();
    const res = await POST(postRequest({ customerCode: 'A000003', name: '新規医院', area: '東京都' }));
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ customer_code: 'A000003', name: '新規医院', area: '東京都', staff_id: null, status_id: null }),
    );
  });
});
