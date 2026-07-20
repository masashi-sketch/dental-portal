// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
let patientIdValue: string | null = null;

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/auth/patientScope', () => ({
  resolveEffectivePatientId: async () => (sessionValue?.user ? patientIdValue : null),
}));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({}),
}));

let diagnosisRows: unknown[] = [];
const stageRow = { code: 2, label: 'ステージII', name: '中等度歯周炎', description: '' };
const gradeRow = { code: 'B', label: 'グレードB', name: '標準的な進行', description: '' };

vi.mock('@/lib/auth/scopedSupabaseClient', () => ({
  getScopedSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'periodontal_diagnoses') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => ({
                  limit: async () => ({ data: diagnosisRows, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'periodontal_stages') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: stageRow }) }) }) };
      }
      if (table === 'periodontal_grades') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: gradeRow }) }) }) };
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

describe('GET /api/patient-portal/diagnosis', () => {
  beforeEach(() => {
    sessionValue = null;
    patientIdValue = null;
    diagnosisRows = [];
  });

  it('未認証ならdiagnosis:nullを返す', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ diagnosis: null });
  });

  it('患者を解決できないプレビューではdiagnosis:nullを返す', async () => {
    sessionValue = makeSession({ role: 'clinic', patientId: null });
    patientIdValue = null;
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ diagnosis: null });
  });

  it('診断記録が無い場合はdiagnosis:nullを返す', async () => {
    sessionValue = makeSession();
    patientIdValue = 'patient-1';
    diagnosisRows = [];
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ diagnosis: null });
  });

  it('最新の診断とステージ・グレードのラベルを返す', async () => {
    sessionValue = makeSession();
    patientIdValue = 'patient-1';
    diagnosisRows = [{ stage_code: 2, grade_code: 'B', diagnosed_at: '2026-07-01', memo: 'メモ' }];
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.diagnosis).toEqual({
      diagnosedAt: '2026-07-01',
      memo: 'メモ',
      stage: stageRow,
      grade: gradeRow,
    });
  });
});
