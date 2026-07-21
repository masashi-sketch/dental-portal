import { afterEach, describe, expect, it } from 'vitest';
import type { Session } from 'next-auth';
import { effectiveAdminCustomerCode } from './effectiveAdminCustomerCode';

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function clearCookies() {
  document.cookie = 'bgj-viewing-customer-code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

describe('effectiveAdminCustomerCode', () => {
  afterEach(() => {
    clearCookies();
  });

  it('clinicロールは常に自院のcustomerCodeを返す（cookieは無視）', () => {
    document.cookie = 'bgj-viewing-customer-code=A999999; path=/';
    const session = makeSession({ role: 'clinic', customerCode: 'A000001' });
    expect(effectiveAdminCustomerCode(session)).toBe('A000001');
  });

  it('bgjロールはbgj-viewing-customer-code cookieを返す', () => {
    document.cookie = 'bgj-viewing-customer-code=A000002; path=/';
    const session = makeSession({ role: 'bgj' });
    expect(effectiveAdminCustomerCode(session)).toBe('A000002');
  });

  it('bgjロールでcookieが無ければnull', () => {
    const session = makeSession({ role: 'bgj' });
    expect(effectiveAdminCustomerCode(session)).toBeNull();
  });

  it('patientロールは常にnull', () => {
    document.cookie = 'bgj-viewing-customer-code=A000002; path=/';
    const session = makeSession({ role: 'patient', patientId: 'p1' });
    expect(effectiveAdminCustomerCode(session)).toBeNull();
  });

  it('セッションが無ければnull', () => {
    expect(effectiveAdminCustomerCode(null)).toBeNull();
  });
});
