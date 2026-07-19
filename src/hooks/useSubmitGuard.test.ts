import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSubmitGuard } from './useSubmitGuard';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('useSubmitGuard', () => {
  it('guard()でラップした処理を実行できる', async () => {
    const { result } = renderHook(() => useSubmitGuard());
    const fn = vi.fn().mockResolvedValue(undefined);

    await act(async () => { await result.current.guard(fn)(); });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.current.submitting).toBe(false);
  });

  it('処理中はsubmittingがtrueになる', async () => {
    const { result } = renderHook(() => useSubmitGuard());
    const { promise, resolve } = deferred<void>();
    const fn = vi.fn().mockReturnValue(promise);

    let submitPromise!: Promise<void>;
    act(() => { submitPromise = result.current.guard(fn)(); });
    expect(result.current.submitting).toBe(true);

    await act(async () => { resolve(); await submitPromise; });
    expect(result.current.submitting).toBe(false);
  });

  it('処理中に再度呼び出しても多重実行しない（二重送信対策）', async () => {
    const { result } = renderHook(() => useSubmitGuard());
    const { promise, resolve } = deferred<void>();
    const fn = vi.fn().mockReturnValue(promise);

    let firstCall!: Promise<void>;
    act(() => { firstCall = result.current.guard(fn)(); });
    // submitting=trueの状態でもう一度呼び出す（同じguard関数インスタンス、二重クリック相当）
    await act(async () => { await result.current.guard(fn)(); });

    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => { resolve(); await firstCall; });
  });

  it('処理が失敗してもsubmittingはfalseに戻る', async () => {
    const { result } = renderHook(() => useSubmitGuard());
    const fn = vi.fn().mockRejectedValue(new Error('failed'));

    await act(async () => {
      await expect(result.current.guard(fn)()).rejects.toThrow('failed');
    });

    expect(result.current.submitting).toBe(false);
  });
});
