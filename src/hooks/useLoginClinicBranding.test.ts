// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { DEFAULT_LOGIN_BACKGROUND, LAST_CLINIC_COOKIE, rememberLoginClinic, useLoginClinicBranding } from './useLoginClinicBranding';

describe('useLoginClinicBranding', () => {
  beforeEach(() => {
    document.cookie = `${LAST_CLINIC_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('前回得意先がない場合は標準背景を使用する', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useLoginClinicBranding());
    expect(result.current.backgroundUrl).toBe(DEFAULT_LOGIN_BACKGROUND);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('前回得意先の患者ポータル設定から表示名と背景を取得する', async () => {
    rememberLoginClinic('A000001');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ displayName: '中央歯科クリニック', backgroundUrl: 'https://example.com/clinic-bg.jpg' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useLoginClinicBranding());
    await waitFor(() => expect(result.current.backgroundUrl).toBe('https://example.com/clinic-bg.jpg'));
    expect(result.current.clinicName).toBe('中央歯科クリニック');
    expect(fetchMock).toHaveBeenCalledWith('/api/clinics/A000001/branding');
  });
});
