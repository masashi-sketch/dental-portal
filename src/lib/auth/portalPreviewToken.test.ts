// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';
import { signPortalPreviewToken, verifyPortalPreviewToken } from './portalPreviewToken';

function session(role: 'bgj' | 'clinic', id: string): Session {
  return {
    user: role === 'bgj'
      ? { role, email: id, customerCode: null, patientId: null }
      : { role, clinicUserId: id, customerCode: 'A000001', patientId: null },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('portalPreviewToken', () => {
  beforeEach(() => vi.stubEnv('AUTH_SECRET', 'preview-test-secret'));

  it('発行したトークンを同じ操作者だけが検証できる', () => {
    const actor = session('bgj', 'staff@biogaia.jp');
    const token = signPortalPreviewToken(actor, 'clinic', 'A000001', 1_000_000);
    expect(verifyPortalPreviewToken(token, actor, 1_000_001)).toMatchObject({ kind: 'clinic', targetId: 'A000001' });
    expect(verifyPortalPreviewToken(token, session('bgj', 'other@biogaia.jp'), 1_000_001)).toBeNull();
  });

  it('改ざん・期限切れを拒否する', () => {
    const actor = session('clinic', 'clinic-user-1');
    const token = signPortalPreviewToken(actor, 'patient', 'patient-1', 1_000_000);
    expect(verifyPortalPreviewToken(`${token}x`, actor, 1_000_001)).toBeNull();
    expect(verifyPortalPreviewToken(token, actor, 1_000_000 + 16 * 60 * 1000)).toBeNull();
  });
});
