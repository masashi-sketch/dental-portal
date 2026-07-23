// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encode } from 'next-auth/jwt';

let cookieHeader = '';
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ cookie: cookieHeader }),
}));

const { readHydratedSession } = await import('./hydratedSession');

describe('readHydratedSession', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_SECRET', 'hydration-test-secret');
    cookieHeader = '';
  });

  it('暗号化済みJWTからDBアクセスなしでSessionProvider初期値を復元する', async () => {
    const value = await encode({
      secret: 'hydration-test-secret',
      salt: 'authjs.session-token',
      token: {
        role: 'clinic',
        name: '医院管理者',
        customerCode: 'A000001',
        clinicUserId: 'clinic-user-1',
        clinicRole: 'admin',
        clinicPermissions: ['view_contacts', 'manage_contacts'],
      },
    });
    cookieHeader = `authjs.session-token=${value}`;

    await expect(readHydratedSession()).resolves.toMatchObject({
      user: {
        role: 'clinic',
        customerCode: 'A000001',
        clinicUserId: 'clinic-user-1',
        clinicRole: 'admin',
      },
    });
  });

  it('Cookieが無ければnull', async () => {
    await expect(readHydratedSession()).resolves.toBeNull();
  });
});
