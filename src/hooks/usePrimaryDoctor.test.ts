import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePrimaryDoctor } from './usePrimaryDoctor';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

describe('usePrimaryDoctor', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('role_labelに「院長」を含むスタッフを選ぶ（配列内の順番に関わらず）', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        staff: [
          { id: 's1', name: '佐藤衛生士', role_label: '歯科衛生士', photo_url: null },
          { id: 's2', name: '山田太郎', role_label: '院長', photo_url: null },
        ],
      })
    );
    const { result } = renderHook(() => usePrimaryDoctor());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.doctor?.name).toBe('山田太郎');
  });

  it('院長ラベルのスタッフがいなければ先頭（sort_order順）のスタッフにフォールバックする', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        staff: [
          { id: 's1', name: '佐藤衛生士', role_label: '歯科衛生士', photo_url: null },
          { id: 's2', name: '鈴木受付', role_label: '受付', photo_url: null },
        ],
      })
    );
    const { result } = renderHook(() => usePrimaryDoctor());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.doctor?.name).toBe('佐藤衛生士');
  });

  it('スタッフが1件もいなければnullを返す', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ staff: [] }));
    const { result } = renderHook(() => usePrimaryDoctor());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.doctor).toBeNull();
  });

  it('取得に失敗した場合はnullを返す', async () => {
    fetchMock.mockImplementation(() => jsonResponse({}, false));
    const { result } = renderHook(() => usePrimaryDoctor());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.doctor).toBeNull();
  });
});
