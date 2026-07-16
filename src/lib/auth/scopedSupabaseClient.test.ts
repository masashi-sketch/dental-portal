// @vitest-environment node
// scopedSupabaseClient.tsは`import 'server-only'`を含むため、windowが存在しないnode環境で実行する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

const createClientMock = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

const { getScopedSupabaseClient } = await import('./scopedSupabaseClient');

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const [, payload] = jwt.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

function makeSession(overrides: Partial<Session['user']>): Session {
  return {
    user: {
      role: 'patient',
      customerCode: 'A000001',
      patientId: 'patient-1',
      email: null,
      ...overrides,
    },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('getScopedSupabaseClient', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_JWT_SECRET', 'test-secret');
  });

  it('SUPABASE_URL/SUPABASE_ANON_KEYでcreateClientを呼ぶ', () => {
    getScopedSupabaseClient(makeSession({}));
    expect(createClientMock).toHaveBeenCalledTimes(1);
    const [url, anonKey] = createClientMock.mock.calls[0];
    expect(url).toBe('https://example.supabase.co');
    expect(anonKey).toBe('anon-key');
  });

  it('セッションのrole/customerCode/patientIdをJWTクレームに正しくマッピングする', () => {
    getScopedSupabaseClient(
      makeSession({ role: 'clinic', customerCode: 'A000002', patientId: null }),
    );
    const [, , options] = createClientMock.mock.calls[0];
    const authHeader = (options as { global: { headers: { Authorization: string } } }).global.headers.Authorization;
    const jwt = authHeader.replace('Bearer ', '');
    const payload = decodeJwtPayload(jwt);
    expect(payload.app_role).toBe('clinic');
    expect(payload.customer_code).toBe('A000002');
    expect(payload.patient_id).toBeNull();
    expect(payload.role).toBe('authenticated');
    expect(payload.aud).toBe('authenticated');
  });

  it('60秒の有効期限を持つ使い捨てトークンを発行する', () => {
    getScopedSupabaseClient(makeSession({}));
    const [, , options] = createClientMock.mock.calls[0];
    const authHeader = (options as { global: { headers: { Authorization: string } } }).global.headers.Authorization;
    const payload = decodeJwtPayload(authHeader.replace('Bearer ', ''));
    expect((payload.exp as number) - (payload.iat as number)).toBe(60);
  });

  it('SUPABASE_JWT_SECRET未設定なら例外を投げる', () => {
    vi.stubEnv('SUPABASE_JWT_SECRET', '');
    expect(() => getScopedSupabaseClient(makeSession({}))).toThrow(
      'SUPABASE_JWT_SECRET が .env.local に設定されていません。',
    );
  });

  it('SUPABASE_URL未設定なら例外を投げる', () => {
    vi.stubEnv('SUPABASE_URL', '');
    expect(() => getScopedSupabaseClient(makeSession({}))).toThrow(
      'SUPABASE_URL / SUPABASE_ANON_KEY が .env.local に設定されていません。',
    );
  });
});
