import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const useSessionMock = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => useSessionMock(),
}));

const { useActiveClinic } = await import('./useActiveClinic');
const { clearClinicInfoRequestCache } = await import('@/lib/client/clinicInfoRequest');

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function clearCookies() {
  document.cookie = 'bgj-viewing-customer-code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

describe('useActiveClinic', () => {
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

  it('clinicロールは自院のcustomerCodeで取得する', async () => {
    useSessionMock.mockReturnValue({
      data: { user: { role: 'clinic', customerCode: 'A000001' } },
      status: 'authenticated',
    });
    fetchMock.mockImplementation(() => jsonResponse({ clinic: { display_name: 'サンプル歯科', staff: null } }));

    const { result } = renderHook(() => useActiveClinic());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.clinicName).toBe('サンプル歯科');
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/clinic-info?customerCode=A000001');
  });

  it('bgjロールはbgj-viewing-customer-code cookieが無ければ取得しない', async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'bgj' } }, status: 'authenticated' });

    const { result } = renderHook(() => useActiveClinic());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.clinicName).toBeNull();
  });

  it('bgjロールでもcookieがあれば、そのcustomerCodeで取得する（医院ポータルのビュー機能）', async () => {
    document.cookie = 'bgj-viewing-customer-code=A000002; path=/';
    useSessionMock.mockReturnValue({ data: { user: { role: 'bgj' } }, status: 'authenticated' });
    fetchMock.mockImplementation(() => jsonResponse({ clinic: { display_name: 'ビュー先歯科', staff: null } }));

    const { result } = renderHook(() => useActiveClinic());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.clinicName).toBe('ビュー先歯科');
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/clinic-info?customerCode=A000002');
  });
});
