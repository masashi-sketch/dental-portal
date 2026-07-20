// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assertLocalBaseUrl, mintBgjSessionCookie } from './mintTestSession.mjs';

describe('assertLocalBaseUrl', () => {
  it('allows localhost', () => {
    expect(() => assertLocalBaseUrl('http://localhost:3000')).not.toThrow();
  });

  it('allows 127.0.0.1', () => {
    expect(() => assertLocalBaseUrl('http://127.0.0.1:3000')).not.toThrow();
  });

  it('rejects production-looking URLs', () => {
    expect(() => assertLocalBaseUrl('https://dental-portal-mock.vercel.app')).toThrow(/localhost限定/);
  });

  it('rejects any other remote host', () => {
    expect(() => assertLocalBaseUrl('https://example.com')).toThrow(/localhost限定/);
  });

  it('rejects malformed URLs', () => {
    expect(() => assertLocalBaseUrl('not-a-url')).toThrow(/不正なURL/);
  });
});

describe('mintBgjSessionCookie', () => {
  it('refuses to mint a session for a non-local base URL even with a valid secret', async () => {
    await expect(
      mintBgjSessionCookie({
        baseUrl: 'https://dental-portal-mock.vercel.app',
        secret: 'dummy-secret',
        email: 'e2e@biogaia.jp',
        name: 'test',
      }),
    ).rejects.toThrow(/localhost限定/);
  });

  it('refuses to mint a session without a secret', async () => {
    await expect(
      mintBgjSessionCookie({
        baseUrl: 'http://localhost:3000',
        secret: undefined,
        email: 'e2e@biogaia.jp',
        name: 'test',
      }),
    ).rejects.toThrow(/AUTH_SECRET/);
  });

  it('mints a session-token cookie for localhost with a secret', async () => {
    const cookie = await mintBgjSessionCookie({
      baseUrl: 'http://localhost:3000',
      secret: 'dummy-secret-value-for-test',
      email: 'e2e-playwright-test@biogaia.jp',
      name: 'E2Eテストユーザー',
    });
    expect(cookie.name).toBe('authjs.session-token');
    expect(cookie.url).toBe('http://localhost:3000');
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
    expect(typeof cookie.value).toBe('string');
    expect(cookie.value.length).toBeGreaterThan(20);
  });
});
