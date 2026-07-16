// @vitest-environment node
// APIルートハンドラを直接呼び出すテスト。歯周病診断（医療情報）の閲覧・登録が
// isPatientInScopeによるテナント分離の範囲内に収まっていることを検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

type ScopeRow = { customer_code: string } | null;
let scopeRow: ScopeRow = null;
const insertSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'patients') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: scopeRow }) }),
          }),
        };
      }
      if (table === 'periodontal_diagnoses') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => ({
                  limit: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            insertSpy(row);
            return {
              select: () => ({
                single: async () => ({ data: { id: 'diag-1', ...row }, error: null }),
              }),
            };
          },
        };
      }
      // periodontal_stages / periodontal_grades
      return { select: async () => ({ data: [], error: null }) };
    },
  }),
}));

const { GET, POST } = await import('./route');

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function postRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/patients/patient-1/diagnoses', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 'patient-1' });

describe('GET/POST /api/admin/patients/[id]/diagnoses', () => {
  beforeEach(() => {
    sessionValue = null;
    scopeRow = null;
    insertSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const getRes = await GET(new NextRequest('http://localhost/x'), { params });
    expect(getRes.status).toBe(401);
    const postRes = await POST(postRequest({ stageCode: 1, gradeCode: 'A' }), { params });
    expect(postRes.status).toBe(401);
  });

  it('clinicロールが他院の患者の診断にアクセスすると404になり、登録は実行されない', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A999999' };

    const getRes = await GET(new NextRequest('http://localhost/x'), { params });
    expect(getRes.status).toBe(404);

    const postRes = await POST(postRequest({ stageCode: 1, gradeCode: 'A' }), { params });
    expect(postRes.status).toBe(404);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('自院の患者なら診断を登録でき、patient_idが正しく設定される', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A000001' };

    const res = await POST(postRequest({ stageCode: 2, gradeCode: 'B', memo: '経過良好' }), { params });
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ patient_id: 'patient-1', stage_code: 2, grade_code: 'B' }));
  });

  it('ステージ・グレードが無ければ400', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    scopeRow = { customer_code: 'A000001' };

    const res = await POST(postRequest({ memo: 'x' }), { params });
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('bgjロールはcustomer_codeが一致しなくても閲覧できる', async () => {
    sessionValue = makeSession({ role: 'bgj' });
    scopeRow = { customer_code: 'A999999' };

    const res = await GET(new NextRequest('http://localhost/x'), { params });
    expect(res.status).toBe(200);
  });
});
