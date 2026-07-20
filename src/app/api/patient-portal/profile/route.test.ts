// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
let patientIdValue: string | null = null;
let patientRow: { name: string | null } | null = null;

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/patientScope', () => ({ resolveEffectivePatientId: async () => (sessionValue?.user ? patientIdValue : null) }));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'patients') throw new Error(`unexpected table: ${table}`);
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: patientRow, error: null }) }) }) };
    },
  }),
}));

const { GET } = await import('./route');

describe('GET /api/patient-portal/profile', () => {
  beforeEach(() => {
    sessionValue = { user: { role: 'patient', patientId: 'patient-1', customerCode: 'A000001' }, expires: '2099-01-01' } as Session;
    patientIdValue = 'patient-1';
    patientRow = { name: '佐藤花子' };
  });

  it('未認証時はnameを返さない', async () => {
    sessionValue = null;
    const response = await GET();
    expect(await response.json()).toEqual({ name: null });
  });

  it('有効患者を解決できないプレビューではnameを返さない', async () => {
    patientIdValue = null;
    const response = await GET();
    expect(await response.json()).toEqual({ name: null });
  });

  it('本人または検証済みプレビュー患者の氏名を返す', async () => {
    const response = await GET();
    expect(await response.json()).toEqual({ name: '佐藤花子' });
  });
});
