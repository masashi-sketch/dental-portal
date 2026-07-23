import { afterEach, describe, expect, it } from 'vitest';
import {
  beginClinicPreview,
  beginPatientPreview,
  markPortalSelected,
  preparePortalLogout,
  readPortalCookieState,
  resetTransientPortalState,
} from './portalState';

describe('portalState', () => {
  afterEach(() => resetTransientPortalState());

  it('医院代理閲覧と患者プレビューを同時に保持しない', () => {
    beginClinicPreview('A000001');
    expect(readPortalCookieState()).toEqual({ clinicPreviewCustomerCode: 'A000001', patientPreviewId: null });

    beginPatientPreview('patient-1');
    expect(readPortalCookieState()).toEqual({ clinicPreviewCustomerCode: null, patientPreviewId: 'patient-1' });
  });

  it('ログアウト時にポータル選択と一時状態をまとめて消す', () => {
    markPortalSelected();
    beginClinicPreview('A000001');
    preparePortalLogout();

    expect(document.cookie).not.toContain('portal-selected=');
    expect(readPortalCookieState()).toEqual({ clinicPreviewCustomerCode: null, patientPreviewId: null });
  });
});
