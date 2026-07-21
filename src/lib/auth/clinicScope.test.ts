// @vitest-environment node
// clinicScope.tsは`import 'server-only'`を含み、windowが存在する環境(jsdom)では
// importした時点でエラーになるため、このテストはnode環境で実行する。
import { describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

// next/headers の cookies() をテスト用にモックする。
// bgj-viewing-customer-code cookieの値だけを差し替えられるようにする
// （patientScope.test.tsのdemo-patient-idモックと同じパターン）。
let mockCookieValue: string | null = null;
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'bgj-viewing-customer-code' && mockCookieValue !== null ? { value: mockCookieValue } : undefined,
  }),
}));

const {
  isClinicResourceInScope,
  isPatientInScope,
  requireBgjSession,
  resolveScopedCustomerCode,
} = await import('./clinicScope');

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

// select().eq().maybeSingle() のチェーンだけを持つ最小限のフェイク
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

describe('requireBgjSession', () => {
  it('セッションがnullならfalse', () => {
    expect(requireBgjSession(null)).toBe(false);
  });

  it('emailが無ければfalse（clinic/patientセッション相当）', () => {
    const session = makeSession({ role: 'bgj', email: undefined as unknown as string });
    expect(requireBgjSession(session)).toBe(false);
  });

  it('roleがbgj以外ならfalse', () => {
    expect(requireBgjSession(makeSession({ role: 'clinic' }))).toBe(false);
    expect(requireBgjSession(makeSession({ role: 'patient' }))).toBe(false);
  });

  it('emailがありroleがbgjならtrue', () => {
    expect(requireBgjSession(makeSession({ role: 'bgj' }))).toBe(true);
  });
});

describe('resolveScopedCustomerCode', () => {
  it('clinicロールはrequestedCodeを無視し、常に自分のcustomerCodeを返す（cookieがあっても無視）', async () => {
    mockCookieValue = 'A999998';
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    await expect(resolveScopedCustomerCode(session, 'A999999')).resolves.toBe('A000001');
    await expect(resolveScopedCustomerCode(session, null)).resolves.toBe('A000001');
    mockCookieValue = null;
  });

  it('bgjロールはrequestedCodeをそのまま信頼する', async () => {
    const session = makeSession({ role: 'bgj' });
    await expect(resolveScopedCustomerCode(session, 'A000002')).resolves.toBe('A000002');
  });

  it('bgjロールでrequestedCodeが無い場合、bgj-viewing-customer-code cookieへフォールバックする', async () => {
    mockCookieValue = 'A000003';
    const session = makeSession({ role: 'bgj' });
    await expect(resolveScopedCustomerCode(session, null)).resolves.toBe('A000003');
    mockCookieValue = null;
  });

  it('bgjロールでrequestedCodeもcookieも無い場合はnull', async () => {
    const session = makeSession({ role: 'bgj' });
    await expect(resolveScopedCustomerCode(session, null)).resolves.toBeNull();
  });
});

describe('isPatientInScope', () => {
  it('bgjロールはDBを見ずに常にtrue', async () => {
    const session = makeSession({ role: 'bgj' });
    const supabase = fakeSupabase(null);
    await expect(isPatientInScope(supabase, 'patient-1', session)).resolves.toBe(true);
  });

  it('clinicロールは患者のcustomer_codeが自院と一致すればtrue', async () => {
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const supabase = fakeSupabase({ customer_code: 'A000001' });
    await expect(isPatientInScope(supabase, 'patient-1', session)).resolves.toBe(true);
  });

  it('clinicロールは他院の患者IDならfalse', async () => {
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const supabase = fakeSupabase({ customer_code: 'A999999' });
    await expect(isPatientInScope(supabase, 'patient-1', session)).resolves.toBe(false);
  });

  it('該当患者が存在しない場合はfalse', async () => {
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const supabase = fakeSupabase(null);
    await expect(isPatientInScope(supabase, 'unknown', session)).resolves.toBe(false);
  });
});

describe('isClinicResourceInScope', () => {
  it('bgjロールはDBを見ずに常にtrue', async () => {
    const session = makeSession({ role: 'bgj' });
    const supabase = fakeSupabase(null);
    await expect(isClinicResourceInScope(supabase, 'clinic_staff', 'staff-1', session)).resolves.toBe(true);
  });

  it('clinicロールは行のcustomer_codeが自院と一致すればtrue', async () => {
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const supabase = fakeSupabase({ customer_code: 'A000001' });
    await expect(isClinicResourceInScope(supabase, 'clinic_qa', 'qa-1', session)).resolves.toBe(true);
  });

  it('clinicロールは他院の行ならfalse', async () => {
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const supabase = fakeSupabase({ customer_code: 'A999999' });
    await expect(isClinicResourceInScope(supabase, 'clinic_qa', 'qa-1', session)).resolves.toBe(false);
  });
});
