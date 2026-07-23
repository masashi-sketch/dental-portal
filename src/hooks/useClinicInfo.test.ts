import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { clearTestPortalPreview, setTestPortalPreview } from '@/test/portalPreview';

const useSessionMock = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => useSessionMock(),
}));

const { useClinicInfo } = await import('./useClinicInfo');
const { clearClinicInfoRequestCache } = await import('@/lib/client/clinicInfoRequest');

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function clearCookies() {
  document.cookie = 'bgj-viewing-customer-code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  clearTestPortalPreview();
}

describe('useClinicInfo', () => {
  beforeEach(() => {
    clearClinicInfoRequestCache();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    clearCookies();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearCookies();
  });

  it('clinicロールは自院のcustomerCodeで取得し、isClinicRoleはtrue', async () => {
    useSessionMock.mockReturnValue({
      data: { user: { role: 'clinic', customerCode: 'A000001' } },
      status: 'authenticated',
    });
    fetchMock.mockImplementation(() => jsonResponse({ clinic: { customer_code: 'A000001', name: 'サンプル歯科' } }));

    const { result } = renderHook(() => useClinicInfo());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.isClinicRole).toBe(true);
    expect(result.current.customerCode).toBe('A000001');
    expect(result.current.clinic?.name).toBe('サンプル歯科');
  });

  it('bgjロールはbgj-viewing-customer-code cookieが無ければ取得しない', async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'bgj' } }, status: 'authenticated' });

    const { result } = renderHook(() => useClinicInfo());
    await waitFor(() => expect(result.current.loaded).toBe(false));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.clinic).toBeNull();
  });

  it('bgjロールでもタブ固有プレビューがあれば取得できる', async () => {
    setTestPortalPreview('clinic', 'A000002');
    useSessionMock.mockReturnValue({ data: { user: { role: 'bgj' } }, status: 'authenticated' });
    fetchMock.mockImplementation(() => jsonResponse({ clinic: { customer_code: 'A000002', name: 'ビュー先歯科' } }));

    const { result } = renderHook(() => useClinicInfo());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.isClinicRole).toBe(false);
    expect(result.current.customerCode).toBe('A000002');
    expect(result.current.clinic?.name).toBe('ビュー先歯科');
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/clinic-info?customerCode=A000002');
  });

  it('取得成功時にonLoadコールバックへ結果を渡す', async () => {
    useSessionMock.mockReturnValue({
      data: { user: { role: 'clinic', customerCode: 'A000001' } },
      status: 'authenticated',
    });
    fetchMock.mockImplementation(() => jsonResponse({ clinic: { customer_code: 'A000001', name: 'サンプル歯科' } }));
    const onLoad = vi.fn();

    const { result } = renderHook(() => useClinicInfo(onLoad));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ name: 'サンプル歯科' }));
  });
});
