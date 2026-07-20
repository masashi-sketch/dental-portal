// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
let customerCodeValue: string | null = null;

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/patientScope', () => ({
  resolveEffectiveCustomerCode: async () => customerCodeValue,
}));

let introRow: Record<string, unknown> | null = null;
let staffRows: unknown[] = [];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'clinic_intro_info') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: introRow, error: null }) }) }) };
      }
      if (table === 'clinic_staff') {
        return { select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: staffRows, error: null }) }) }) }) };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { GET } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'patient', customerCode: 'A000001', patientId: 'patient-1', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('GET /api/patient-portal/clinic-intro', () => {
  beforeEach(() => {
    sessionValue = null;
    customerCodeValue = null;
    introRow = null;
    staffRows = [];
  });

  it('得意先を解決できない場合はinfo:null・staff:[]を返す', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ info: null, staff: [] });
  });

  it('紹介情報とスタッフ一覧を返す', async () => {
    sessionValue = makeSession();
    customerCodeValue = 'A000001';
    introRow = { customer_code: 'A000001', clinic_phone: '03-0000-0000' };
    staffRows = [{ id: 'staff-1', name: '山田太郎', role_label: '院長' }];
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.info).toEqual(introRow);
    expect(body.staff).toEqual(staffRows);
  });
});
