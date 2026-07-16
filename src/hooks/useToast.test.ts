import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初期状態は空文字', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toast).toBe('');
  });

  it('showToastを呼ぶとメッセージが即座に表示される', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.showToast('保存しました'); });
    expect(result.current.toast).toBe('保存しました');
  });

  it('duration経過前は表示され続ける', () => {
    const { result } = renderHook(() => useToast(2500));
    act(() => { result.current.showToast('保存しました'); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.toast).toBe('保存しました');
  });

  it('duration経過後に自動的に消える', () => {
    const { result } = renderHook(() => useToast(2500));
    act(() => { result.current.showToast('保存しました'); });
    act(() => { vi.advanceTimersByTime(2500); });
    expect(result.current.toast).toBe('');
  });

  it('連続呼び出し時は前のタイマーがクリアされ、最新メッセージの表示時間から再カウントされる', () => {
    const { result } = renderHook(() => useToast(2500));
    act(() => { result.current.showToast('1件目'); });
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => { result.current.showToast('2件目'); });
    // 1件目の呼び出しからは4000ms経過しているが、2件目からは2000msしか経っていない
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.toast).toBe('2件目');
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.toast).toBe('');
  });
});
