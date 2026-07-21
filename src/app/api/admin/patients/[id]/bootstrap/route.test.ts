// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';
import { NextRequest } from 'next/server';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({ auth: async () => sessionValue }));

const stages = [{ code: 1, label: 'ステージI' }];
const grades = [{ code: 'A', label: 'グレードA' }];
vi.mock('@/lib/periodontalMaster', () => ({
  getCachedPeriodontalMaster: async () => ({ stages, grades }),
}));

let patientData: Record<string, unknown> | null = null;
let patientError: { message: string } | null = null;
let diagnosesError: { message: string } | null = null;
const patientEqSpy = vi.fn();

function queryFor(table: string) {
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      if (table === 'patients') patientEqSpy(column, value);
      return query;
    },
    order: () => query,
    limit: () => Promise.resolve({
      data: table === 'periodontal_diagnoses'
        ? [{ id: 'diagnosis-1', stage_code: 1, grade_code: 'A' }]
        : [],
      error: diagnosesError,
    }),
    maybeSingle: () => Promise.resolve({ data: patientData, error: patientError }),
  };
  return query;
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({ from: (table: string) => queryFor(table) }),
}));

const { GET } = await import('./route');
const params = Promise.resolve({ id: 'patient-1' });
const request = new NextRequest('http://localhost/api/admin/patients/patient-1/bootstrap');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('GET /api/admin/patients/[id]/bootstrap', () => {
  beforeEach(() => {
    sessionValue = null;
    patientData = { id: 'patient-1', customer_code: 'A000001', name: '山田太郎' };
    patientError = null;
    diagnosesError = null;
    patientEqSpy.mockReset();
  });

  it('未認証とpatientロールを拒否する', async () => {
    expect((await GET(request, { params })).status).toBe(401);
    sessionValue = makeSession({ role: 'patient' });
    expect((await GET(request, { params })).status).toBe(401);
  });

  it('患者・診断・マスタをまとめ、診断にマスタ情報を付けて返す', async () => {
    sessionValue = makeSession();
    const response = await GET(request, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.patient.name).toBe('山田太郎');
    expect(body.diagnoses[0]).toEqual(expect.objectContaining({
      id: 'diagnosis-1',
      stage: stages[0],
      grade: grades[0],
    }));
    expect(body.stages).toEqual(stages);
    expect(body.grades).toEqual(grades);
    expect(response.headers.get('server-timing')).toMatch(/auth;dur=.*database;dur=.*total;dur=/);
  });

  it('clinicロールは患者取得時点で自院コードにスコープされる', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    expect((await GET(request, { params })).status).toBe(200);
    expect(patientEqSpy).toHaveBeenCalledWith('customer_code', 'A000001');
  });

  it('対象患者がスコープ内に存在しなければ404', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    patientData = null;
    expect((await GET(request, { params })).status).toBe(404);
  });

  it('DBエラーを500で返す', async () => {
    sessionValue = makeSession();
    diagnosesError = { message: 'database error' };
    expect((await GET(request, { params })).status).toBe(500);
  });
});
