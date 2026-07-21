import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearClinicInfoRequestCache, requestClinicInfo } from './clinicInfoRequest';

const fetchMock = vi.fn();

describe('requestClinicInfo', () => {
  beforeEach(() => {
    clearClinicInfoRequestCache();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('同じ医院への同時リクエストを1回にまとめる', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ clinic: { customer_code: 'A000001', name: 'テスト医院' } }),
    });

    const [first, second] = await Promise.all([
      requestClinicInfo('A000001'),
      requestClinicInfo('A000001'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first?.name).toBe('テスト医院');
    expect(second).toEqual(first);
  });

  it('医院コードが異なる場合は別々に取得する', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ clinic: null }) });
    await Promise.all([requestClinicInfo('A000001'), requestClinicInfo('A000002')]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
