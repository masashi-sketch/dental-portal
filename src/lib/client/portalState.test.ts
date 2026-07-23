import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bootstrapPortalPreviewFromLocation,
  installPortalPreviewFetch,
  markPortalSelected,
  preparePortalLogout,
  readPortalCookieState,
  resetTransientPortalState,
} from './portalState';

function previewToken(kind: 'clinic' | 'patient', targetId: string): string {
  const payload = { v: 1, kind, targetId, actor: 'test', exp: Math.floor(Date.now() / 1000) + 900 };
  return `${btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}.signature`;
}

describe('portalState', () => {
  afterEach(() => {
    resetTransientPortalState();
    window.history.replaceState(null, '', '/');
  });

  it('URLの署名トークンをタブ固有sessionStorageへ移し、URLから除去する', () => {
    window.history.replaceState(null, '', `/?portalPreview=${encodeURIComponent(previewToken('clinic', 'A000001'))}`);
    bootstrapPortalPreviewFromLocation();

    expect(readPortalCookieState()).toEqual({ clinicPreviewCustomerCode: 'A000001', patientPreviewId: null });
    expect(window.location.search).toBe('');
  });

  it('患者プレビューは患者IDだけを現在タブに保持する', () => {
    window.history.replaceState(null, '', `/?portalPreview=${encodeURIComponent(previewToken('patient', 'patient-1'))}`);
    bootstrapPortalPreviewFromLocation();
    expect(readPortalCookieState()).toEqual({ clinicPreviewCustomerCode: null, patientPreviewId: 'patient-1' });
  });

  it('対象APIだけに現在タブのプレビュートークンを付与する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    window.fetch = fetchMock;
    window.history.replaceState(null, '', `/?portalPreview=${encodeURIComponent(previewToken('clinic', 'A000001'))}`);
    bootstrapPortalPreviewFromLocation();
    installPortalPreviewFetch();

    await window.fetch('/api/admin/overview');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('x-portal-preview-token')).toContain('.signature');
  });

  it('ログアウト時にポータル選択と一時状態をまとめて消す', () => {
    markPortalSelected();
    window.history.replaceState(null, '', `/?portalPreview=${encodeURIComponent(previewToken('clinic', 'A000001'))}`);
    bootstrapPortalPreviewFromLocation();
    preparePortalLogout();

    expect(document.cookie).not.toContain('portal-selected=');
    expect(readPortalCookieState()).toEqual({ clinicPreviewCustomerCode: null, patientPreviewId: null });
  });
});
