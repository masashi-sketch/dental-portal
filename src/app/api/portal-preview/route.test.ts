// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';
import { verifyPortalPreviewToken } from '@/lib/auth/portalPreviewToken';

let sessionValue: Session | null = null;
let clinicRow: { customer_code: string } | null = { customer_code: 'A000001' };
let patientRow: { id: string; customer_code: string } | null = { id: 'patient-1', customer_code: 'A000001' };

vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: table === 'clinics' ? clinicRow : patientRow, error: null }),
        }),
      }),
    }),
  }),
}));

const { POST } = await import('./route');

function makeSession(role: 'bgj' | 'clinic'): Session {
  return {
    user: role === 'bgj'
      ? { role, email: 'staff@biogaia.jp', customerCode: null, patientId: null }
      : { role, clinicUserId: 'clinic-user-1', customerCode: 'A000001', patientId: null },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function request(kind: 'clinic' | 'patient', targetId: string) {
  return new Request('https://example.com/api/portal-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, targetId }),
  });
}

describe('POST /api/portal-preview', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_SECRET', 'preview-test-secret');
    sessionValue = null;
    clinicRow = { customer_code: 'A000001' };
    patientRow = { id: 'patient-1', customer_code: 'A000001' };
  });

  it('未認証では発行しない', async () => {
    expect((await POST(request('clinic', 'A000001'))).status).toBe(401);
  });

  it('BGJ職員へ操作者に紐づく医院プレビュートークンを発行する', async () => {
    sessionValue = makeSession('bgj');
    const response = await POST(request('clinic', 'A000001'));
    const body = await response.json() as { token: string };
    expect(response.status).toBe(200);
    expect(verifyPortalPreviewToken(body.token, sessionValue)).toMatchObject({ kind: 'clinic', targetId: 'A000001' });
  });

  it('医院担当者は他院患者のプレビューを発行できない', async () => {
    sessionValue = makeSession('clinic');
    patientRow = { id: 'patient-2', customer_code: 'A999999' };
    expect((await POST(request('patient', 'patient-2'))).status).toBe(403);
  });
});
