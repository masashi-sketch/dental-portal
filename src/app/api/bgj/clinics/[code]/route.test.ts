// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let clinicRow: Record<string, unknown> | null = { customer_code: 'A000001', name: '得意先1', staff_id: null, status_id: null };
const settingsRow: Record<string, unknown> = { customer_code: 'A000001' };
const introRow: Record<string, unknown> = { customer_code: 'A000001' };
const updateSpy = vi.fn();
const upsertSpy = vi.fn();
const salesRepRows = [{ id: 'rep-1', name: '営業担当', role_id: null, area_id: null }];
const clinicStatusRows = [{ id: 'status-1', name: '契約中', color: 'emerald' }];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'clinics') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: clinicRow, error: null }) }) }),
          update: (patch: Record<string, unknown>) => {
            updateSpy('clinics', patch);
            return { eq: () => ({ select: () => ({ single: async () => ({ data: { customer_code: 'A000001' }, error: null }) }) }) };
          },
        };
      }
      if (table === 'clinic_patient_settings') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: settingsRow, error: null }) }) }),
          upsert: (row: Record<string, unknown>) => {
            upsertSpy('clinic_patient_settings', row);
            return { select: () => ({ single: async () => ({ data: { customer_code: 'A000001' }, error: null }) }) };
          },
        };
      }
      if (table === 'clinic_intro_info') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: introRow, error: null }) }) }),
          upsert: (row: Record<string, unknown>) => {
            upsertSpy('clinic_intro_info', row);
            return { select: () => ({ single: async () => ({ data: { customer_code: 'A000001' }, error: null }) }) };
          },
        };
      }
      if (table === 'sales_reps') {
        return { select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null }) }),
          order: () => ({ limit: async () => ({ data: salesRepRows, error: null }) }),
        }) };
      }
      if (table === 'staff_roles' || table === 'staff_areas') {
        return { select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null }) }),
          limit: async () => ({ data: [], error: null }),
        }) };
      }
      if (table === 'clinic_statuses') {
        return { select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null }) }),
          order: () => ({ limit: async () => ({ data: clinicStatusRows, error: null }) }),
        }) };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { GET, PATCH } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/bgj/clinics/A000001', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ code: 'A000001' });

describe('GET /api/bgj/clinics/[code]', () => {
  beforeEach(() => {
    sessionValue = null;
    clinicRow = { customer_code: 'A000001', name: '得意先1', staff_id: null, status_id: null };
  });

  it('未認証なら401', async () => {
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001'), { params });
    expect(res.status).toBe(401);
  });

  it('clinicロールは401（BGJ専用）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001'), { params });
    expect(res.status).toBe(401);
  });

  it('得意先が存在しない場合はclinic:nullを返す', async () => {
    sessionValue = makeSession();
    clinicRow = null;
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001'), { params });
    const body = await res.json();
    expect(body).toEqual({ clinic: null });
  });

  it('staff_id・status_idが無ければstaff/statusはnullで返す', async () => {
    sessionValue = makeSession();
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001'), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.clinic).toEqual(expect.objectContaining({ customer_code: 'A000001', staff: null, status: null }));
  });

  it('edit-options指定時は得意先・営業担当・ステータスを一括で返す', async () => {
    sessionValue = makeSession();
    clinicRow = { customer_code: 'A000001', name: '得意先1', staff_id: 'rep-1', status_id: 'status-1' };
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001?include=edit-options'), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(res.headers.get('server-timing')).toMatch(/auth;dur=.*database;dur=.*total;dur=/);
    expect(body.clinic).toEqual(expect.objectContaining({
      staff: expect.objectContaining({ id: 'rep-1' }),
      status: expect.objectContaining({ id: 'status-1' }),
    }));
    expect(body.salesReps).toHaveLength(1);
    expect(body.clinicStatuses).toHaveLength(1);
  });
});

describe('PATCH /api/bgj/clinics/[code]', () => {
  beforeEach(() => {
    sessionValue = null;
    clinicRow = { customer_code: 'A000001', name: '得意先1', staff_id: null, status_id: null };
    updateSpy.mockReset();
    upsertSpy.mockReset();
  });

  it('未認証なら401（更新しない）', async () => {
    const res = await PATCH(patchRequest({ name: '更新後' }), { params });
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('coreフィールドはclinicsをupdateする', async () => {
    sessionValue = makeSession();
    const res = await PATCH(patchRequest({ name: '更新後の医院名', chairs: 5 }), { params });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith('clinics', { name: '更新後の医院名', chairs: 5 });
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('displayNameはclinic_patient_settingsをupsertする', async () => {
    sessionValue = makeSession();
    await PATCH(patchRequest({ displayName: '新表示名' }), { params });
    expect(upsertSpy).toHaveBeenCalledWith('clinic_patient_settings', expect.objectContaining({ customer_code: 'A000001', display_name: '新表示名' }));
  });

  it('regenerateSignupPinを指定すると、PIN関連フィールドが全てsettingsUpdateに含まれる', async () => {
    sessionValue = makeSession();
    await PATCH(patchRequest({ regenerateSignupPin: true }), { params });
    expect(upsertSpy).toHaveBeenCalledWith(
      'clinic_patient_settings',
      expect.objectContaining({
        customer_code: 'A000001',
        signup_pin_failed_attempts: 0,
        signup_pin_locked_until: null,
      }),
    );
    const [, row] = upsertSpy.mock.calls.find(([table]) => table === 'clinic_patient_settings') ?? [];
    expect(row.signup_pin).toEqual(expect.any(String));
    expect(row.signup_slug).toEqual(expect.any(String));
  });
});
