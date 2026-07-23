// @vitest-environment node
// clinicScope.tsは`import 'server-only'`を含み、windowが存在する環境(jsdom)では
// importした時点でエラーになるため、このテストはnode環境で実行する。
import { describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

let mockPreviewToken: string | null = null;
vi.mock('next/headers', () => ({
  headers: async () => new Headers(mockPreviewToken ? { 'x-portal-preview-token': mockPreviewToken } : undefined),
}));

const {
  isClinicResourceInScope,
  isPatientInScope,
  hasClinicPermission,
  requireBgjSession,
  resolveScopedCustomerCode,
} = await import('./clinicScope');
const { signPortalPreviewToken } = await import('./portalPreviewToken');

describe('hasClinicPermission', () => {
  it('BGJセッションは全ての医院担当者操作が可能', () => {
    expect(hasClinicPermission(makeSession({ role: 'bgj' }), 'manage_logins')).toBe(true);
  });

  it('医院管理者のみ担当者とログインを編集できる', () => {
    expect(hasClinicPermission(makeSession({ role: 'clinic', clinicRole: 'admin' }), 'manage_contacts')).toBe(true);
    expect(hasClinicPermission(makeSession({ role: 'clinic', clinicRole: 'staff' }), 'manage_contacts')).toBe(false);
    expect(hasClinicPermission(makeSession({ role: 'clinic', clinicRole: 'viewer' }), 'manage_logins')).toBe(false);
  });

  it('無効化済みセッションには閲覧も許可しない', () => {
    expect(hasClinicPermission(makeSession({ role: 'clinic', clinicRole: 'admin', accountDisabled: true }), 'view_contacts')).toBe(false);
  });
});

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
  it('clinicロールはrequestedCodeを無視し、常に自分のcustomerCodeを返す', async () => {
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    await expect(resolveScopedCustomerCode(session, 'A999999')).resolves.toBe('A000001');
    await expect(resolveScopedCustomerCode(session, null)).resolves.toBe('A000001');
  });

  it('bgjロールはrequestedCodeをそのまま信頼する', async () => {
    const session = makeSession({ role: 'bgj' });
    await expect(resolveScopedCustomerCode(session, 'A000002')).resolves.toBe('A000002');
  });

  it('bgjロールでrequestedCodeが無い場合、署名済みプレビューへフォールバックする', async () => {
    vi.stubEnv('AUTH_SECRET', 'preview-test-secret');
    const session = makeSession({ role: 'bgj' });
    mockPreviewToken = signPortalPreviewToken(session, 'clinic', 'A000003');
    await expect(resolveScopedCustomerCode(session, null)).resolves.toBe('A000003');
    mockPreviewToken = null;
  });

  it('bgjロールでrequestedCodeもプレビューも無い場合はnull', async () => {
    mockPreviewToken = null;
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
