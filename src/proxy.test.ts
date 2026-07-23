// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';

vi.mock('@/auth', () => ({
  auth: (callback: unknown) => callback,
}));

let proxy: (request: NextRequest & { auth: unknown }) => Response;
let config: { matcher: string[] };

beforeAll(async () => {
  const proxyModule = await import('./proxy');
  proxy = proxyModule.default as unknown as typeof proxy;
  config = proxyModule.config;
});

describe('proxy matcher', () => {
  it.each([
    '/',
    '/clinic-login',
    '/bgj-login',
    '/join/example',
    '/forgot-password',
    '/api/auth/session',
    '/api/clinics/A000001/branding',
    '/login-bg.jpg',
  ])('公開パス %s ではProxyを実行しない', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
  });

  it.each([
    '/admin/dashboard',
    '/bgj/dashboard',
    '/home',
    '/shop/product-id',
    '/api/admin/overview',
    '/api/bgj/dashboard-overview',
    '/api/patient-portal/profile',
  ])('保護パス %s ではProxyを実行する', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
  });
});

describe('external-links access', () => {
  function request(method: string) {
    const req = new NextRequest('https://example.com/api/bgj/external-links', {
      method,
      headers: { cookie: 'portal-selected=true' },
    }) as NextRequest & { auth: unknown };
    req.auth = { user: { role: 'clinic', customerCode: 'A000001' } };
    return req;
  }

  it('clinicロールのGETはAPI自身の認可へ通す', () => {
    const response = proxy(request('GET'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('clinicロールの更新系はBGJ領域へ入れない', () => {
    const response = proxy(request('POST'));
    expect(response.headers.get('location')).toBe('https://example.com/admin');
  });
});

describe('医院の閲覧専用ロール', () => {
  function request(method: string) {
    const req = new NextRequest('https://example.com/api/admin/orders', {
      method,
      headers: { cookie: 'portal-selected=true' },
    }) as NextRequest & { auth: unknown };
    req.auth = { user: { role: 'clinic', clinicRole: 'viewer', customerCode: 'A000001' } };
    return req;
  }

  it('GETは通す', () => {
    expect(proxy(request('GET')).status).not.toBe(403);
  });

  it('更新系メソッドは403で拒否する', async () => {
    const response = proxy(request('POST'));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: '閲覧専用アカウントでは更新できません。' });
  });
});
