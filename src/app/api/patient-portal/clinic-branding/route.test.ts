// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
let customerCodeValue: string | null = null;

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/patientScope', () => ({
  resolveEffectiveCustomerCode: async () => customerCodeValue,
}));

let clinicRow: { name: string } | null = { name: 'サンプル歯科' };
let settingsRow: Record<string, unknown> | null = null;

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'clinics') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: clinicRow }) }) }) };
      }
      if (table === 'clinic_patient_settings') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: settingsRow, error: null }) }) }) };
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

describe('GET /api/patient-portal/clinic-branding', () => {
  beforeEach(() => {
    sessionValue = null;
    customerCodeValue = null;
    clinicRow = { name: 'サンプル歯科' };
    settingsRow = null;
  });

  it('得意先を解決できない場合はデフォルト値（歯周病表示ON等）を返す', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.displayName).toBeNull();
    expect(body.showPeriodontalDiagnosis).toBe(true);
  });

  it('設定行が無い場合もデフォルト値を返す', async () => {
    sessionValue = makeSession();
    customerCodeValue = 'A000001';
    const res = await GET();
    const body = await res.json();
    expect(body.displayName).toBeNull();
    expect(body.showPeriodontalDiagnosis).toBe(true);
  });

  it('display_name未設定時はclinics.nameにフォールバックし、nav設定を組み立てる', async () => {
    sessionValue = makeSession();
    customerCodeValue = 'A000001';
    settingsRow = {
      display_name: null,
      patient_background_url: 'https://example.com/bg.png',
      nav_show_clinic_info: true,
      nav_show_medical_record: false,
      nav_show_medication: true,
      nav_show_subscription: true,
      nav_show_shop: true,
      nav_show_qa: true,
      show_periodontal_diagnosis: false,
    };
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.displayName).toBe('サンプル歯科');
    expect(body.backgroundUrl).toBe('https://example.com/bg.png');
    expect(body.nav).toEqual({
      clinicInfo: true,
      medicalRecord: false,
      medication: true,
      subscription: true,
      shop: true,
      qa: true,
    });
    expect(body.showPeriodontalDiagnosis).toBe(false);
  });
});
