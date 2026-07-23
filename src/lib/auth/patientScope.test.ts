// @vitest-environment node
// patientScope.tsは`import 'server-only'`を含むため、windowが存在しないnode環境で実行する。
import { describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

let mockPreviewToken: string | null = null;
vi.mock('next/headers', () => ({
  headers: async () => new Headers(mockPreviewToken ? { 'x-portal-preview-token': mockPreviewToken } : undefined),
}));

const { resolveEffectiveCustomerCode, resolveEffectivePatientId } = await import('./patientScope');
const { signPortalPreviewToken } = await import('./portalPreviewToken');

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: {
      role: 'bgj',
      customerCode: null,
      patientId: null,
      email: 'staff@biogaia.jp',
      clinicUserId: 'clinic-user-1',
      ...overrides,
    },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function fakeSupabase(data: { customer_code: string } | null): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('resolveEffectivePatientId', () => {
  it('セッションが無ければnull', async () => {
    mockPreviewToken = null;
    await expect(resolveEffectivePatientId(fakeSupabase(null), null)).resolves.toBeNull();
  });

  it('patientロールは常に自分自身のpatientId（プレビューを見ない）', async () => {
    const session = makeSession({ role: 'patient', patientId: 'my-id', customerCode: 'A000001' });
    await expect(resolveEffectivePatientId(fakeSupabase(null), session)).resolves.toBe('my-id');
  });

  it('bgjロールは署名済み患者プレビューを利用する', async () => {
    vi.stubEnv('AUTH_SECRET', 'preview-test-secret');
    const session = makeSession({ role: 'bgj' });
    mockPreviewToken = signPortalPreviewToken(session, 'patient', 'preview-patient-1');
    await expect(resolveEffectivePatientId(fakeSupabase(null), session)).resolves.toBe('preview-patient-1');
  });

  it('bgjロールでプレビューが無ければnull', async () => {
    mockPreviewToken = null;
    const session = makeSession({ role: 'bgj' });
    await expect(resolveEffectivePatientId(fakeSupabase(null), session)).resolves.toBeNull();
  });

  it('clinicロールは自院の患者のプレビューのみ許可する', async () => {
    vi.stubEnv('AUTH_SECRET', 'preview-test-secret');
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    mockPreviewToken = signPortalPreviewToken(session, 'patient', 'preview-patient-1');
    const supabase = fakeSupabase({ customer_code: 'A000001' });
    await expect(resolveEffectivePatientId(supabase, session)).resolves.toBe('preview-patient-1');
  });

  it('clinicロールは他院の患者IDをプレビューできない', async () => {
    vi.stubEnv('AUTH_SECRET', 'preview-test-secret');
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    mockPreviewToken = signPortalPreviewToken(session, 'patient', 'preview-patient-1');
    const supabase = fakeSupabase({ customer_code: 'A999999' });
    await expect(resolveEffectivePatientId(supabase, session)).resolves.toBeNull();
  });
});

describe('resolveEffectiveCustomerCode', () => {
  it('patient/clinicロールはセッションのcustomerCodeをそのまま返す', async () => {
    mockPreviewToken = null;
    await expect(
      resolveEffectiveCustomerCode(fakeSupabase(null), makeSession({ role: 'patient', customerCode: 'A000001' })),
    ).resolves.toBe('A000001');
    await expect(
      resolveEffectiveCustomerCode(fakeSupabase(null), makeSession({ role: 'clinic', customerCode: 'A000002' })),
    ).resolves.toBe('A000002');
  });

  it('bgjロールはプレビュー対象患者の得意先コードを引く（他院も可）', async () => {
    vi.stubEnv('AUTH_SECRET', 'preview-test-secret');
    const session = makeSession({ role: 'bgj' });
    mockPreviewToken = signPortalPreviewToken(session, 'patient', 'preview-patient-1');
    const supabase = fakeSupabase({ customer_code: 'A999999' });
    await expect(resolveEffectiveCustomerCode(supabase, session)).resolves.toBe('A999999');
  });

  it('bgjロールでプレビューが無ければnull', async () => {
    mockPreviewToken = null;
    const session = makeSession({ role: 'bgj' });
    await expect(resolveEffectiveCustomerCode(fakeSupabase(null), session)).resolves.toBeNull();
  });
});
