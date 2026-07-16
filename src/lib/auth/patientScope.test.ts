// @vitest-environment node
// patientScope.tsは`import 'server-only'`を含むため、windowが存在しないnode環境で実行する。
import { describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

// next/headers の cookies() をテスト用にモックする。
// demo-patient-id cookieの値だけを差し替えられるようにする。
let mockCookieValue: string | null = null;
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'demo-patient-id' && mockCookieValue !== null ? { value: mockCookieValue } : undefined,
  }),
}));

const { resolveEffectiveCustomerCode, resolveEffectivePatientId } = await import('./patientScope');

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: {
      role: 'bgj',
      customerCode: null,
      patientId: null,
      email: 'staff@biogaia.jp',
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
    mockCookieValue = null;
    await expect(resolveEffectivePatientId(fakeSupabase(null), null)).resolves.toBeNull();
  });

  it('patientロールは常に自分自身のpatientId（cookieを見ない）', async () => {
    mockCookieValue = 'other-patient-id';
    const session = makeSession({ role: 'patient', patientId: 'my-id', customerCode: 'A000001' });
    await expect(resolveEffectivePatientId(fakeSupabase(null), session)).resolves.toBe('my-id');
  });

  it('bgjロールはdemo-patient-id cookieの値をそのまま信頼する', async () => {
    mockCookieValue = 'preview-patient-1';
    const session = makeSession({ role: 'bgj' });
    await expect(resolveEffectivePatientId(fakeSupabase(null), session)).resolves.toBe('preview-patient-1');
  });

  it('bgjロールでcookieが無ければnull', async () => {
    mockCookieValue = null;
    const session = makeSession({ role: 'bgj' });
    await expect(resolveEffectivePatientId(fakeSupabase(null), session)).resolves.toBeNull();
  });

  it('clinicロールは自院の患者のプレビューのみ許可する', async () => {
    mockCookieValue = 'preview-patient-1';
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const supabase = fakeSupabase({ customer_code: 'A000001' });
    await expect(resolveEffectivePatientId(supabase, session)).resolves.toBe('preview-patient-1');
  });

  it('clinicロールは他院の患者IDをプレビューできない', async () => {
    mockCookieValue = 'preview-patient-1';
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const supabase = fakeSupabase({ customer_code: 'A999999' });
    await expect(resolveEffectivePatientId(supabase, session)).resolves.toBeNull();
  });
});

describe('resolveEffectiveCustomerCode', () => {
  it('patient/clinicロールはセッションのcustomerCodeをそのまま返す', async () => {
    mockCookieValue = null;
    await expect(
      resolveEffectiveCustomerCode(fakeSupabase(null), makeSession({ role: 'patient', customerCode: 'A000001' })),
    ).resolves.toBe('A000001');
    await expect(
      resolveEffectiveCustomerCode(fakeSupabase(null), makeSession({ role: 'clinic', customerCode: 'A000002' })),
    ).resolves.toBe('A000002');
  });

  it('bgjロールはプレビュー対象患者の得意先コードを引く（他院も可）', async () => {
    mockCookieValue = 'preview-patient-1';
    const session = makeSession({ role: 'bgj' });
    const supabase = fakeSupabase({ customer_code: 'A999999' });
    await expect(resolveEffectiveCustomerCode(supabase, session)).resolves.toBe('A999999');
  });

  it('bgjロールでcookieが無ければnull', async () => {
    mockCookieValue = null;
    const session = makeSession({ role: 'bgj' });
    await expect(resolveEffectiveCustomerCode(fakeSupabase(null), session)).resolves.toBeNull();
  });
});
