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

let clinicRow: Record<string, unknown> | null = { customer_code: 'A000001', name: 'サンプル歯科', staff_id: null };
const settingsRow: Record<string, unknown> | null = { customer_code: 'A000001', display_name: null };
const introRow: Record<string, unknown> | null = { customer_code: 'A000001', clinic_phone: null };
let currentNavRow: Record<string, boolean> | null = null;
const upsertSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'clinics') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: clinicRow, error: null }) }) }) };
      }
      if (table === 'clinic_patient_settings') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: currentNavRow ?? settingsRow }) }) }),
          upsert: (row: Record<string, unknown>) => {
            upsertSpy('clinic_patient_settings', row);
            return { select: () => ({ single: async () => ({ data: { ...settingsRow, ...row }, error: null }) }) };
          },
        };
      }
      if (table === 'clinic_intro_info') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: introRow, error: null }) }) }),
          upsert: (row: Record<string, unknown>) => {
            upsertSpy('clinic_intro_info', row);
            return { select: () => ({ single: async () => ({ data: { ...introRow, ...row }, error: null }) }) };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { GET, PATCH } = await import('./route');

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function getRequest(customerCode: string | null) {
  const url = customerCode
    ? `http://localhost/api/admin/clinic-info?customerCode=${customerCode}`
    : 'http://localhost/api/admin/clinic-info';
  return new NextRequest(url);
}

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/clinic-info', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

describe('GET /api/admin/clinic-info', () => {
  beforeEach(() => {
    sessionValue = null;
    clinicRow = { customer_code: 'A000001', name: 'サンプル歯科', staff_id: null };
  });

  it('未認証なら401', async () => {
    const res = await GET(getRequest(null));
    expect(res.status).toBe(401);
  });

  it('bgjロールがcustomerCode未指定ならclinic:nullを返す', async () => {
    sessionValue = makeSession({ role: 'bgj' });
    const res = await GET(getRequest(null));
    const body = await res.json();
    expect(body).toEqual({ clinic: null });
  });

  it('clinicロールは自院のクリニック本体・設定・紹介情報をマージして返す', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET(getRequest(null));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(res.headers.get('server-timing')).toMatch(/auth;dur=.*clinic_database;dur=.*total;dur=/);
    expect(body.clinic).toEqual(expect.objectContaining({ customer_code: 'A000001', name: 'サンプル歯科', staff: null }));
  });
});

describe('PATCH /api/admin/clinic-info', () => {
  beforeEach(() => {
    sessionValue = null;
    currentNavRow = null;
    upsertSpy.mockReset();
  });

  it('未認証なら401（更新しない）', async () => {
    const res = await PATCH(patchRequest({ displayName: 'X' }));
    expect(res.status).toBe(401);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('bgjロールは401（clinicロール専用のため）', async () => {
    sessionValue = makeSession({ role: 'bgj' });
    const res = await PATCH(patchRequest({ displayName: 'X' }));
    expect(res.status).toBe(401);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('患者ポータルの全メニューをOFFにしようとすると400（更新しない）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    currentNavRow = {
      nav_show_clinic_info: true,
      nav_show_medical_record: false,
      nav_show_medication: false,
      nav_show_subscription: false,
      nav_show_shop: false,
      nav_show_qa: false,
    };
    const res = await PATCH(patchRequest({ navShowClinicInfo: false }));
    expect(res.status).toBe(400);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('表示名を更新するとclinic_patient_settingsだけupsertされ、自院のcustomer_codeが使われる', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await PATCH(patchRequest({ displayName: '新しい医院名' }));
    expect(res.status).toBe(200);
    expect(upsertSpy).toHaveBeenCalledWith(
      'clinic_patient_settings',
      expect.objectContaining({ customer_code: 'A000001', display_name: '新しい医院名' }),
    );
    expect(upsertSpy).not.toHaveBeenCalledWith('clinic_intro_info', expect.anything());
  });

  it('bodyのcustomerCodeは無視され、常にセッションの自院コードが使われる', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    await PATCH(patchRequest({ displayName: 'X', customerCode: 'A999999' }));
    expect(upsertSpy).toHaveBeenCalledWith(
      'clinic_patient_settings',
      expect.objectContaining({ customer_code: 'A000001' }),
    );
  });
});
