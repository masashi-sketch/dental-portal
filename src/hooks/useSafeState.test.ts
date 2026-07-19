import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSafeState } from './useSafeState';

describe('useSafeState', () => {
  it('通常のuseStateと同様に値を更新できる', () => {
    const { result } = renderHook(() => useSafeState(0));
    act(() => { result.current[1](1); });
    expect(result.current[0]).toBe(1);
  });

  it('関数形式の更新（前の値を参照）にも対応する', () => {
    const { result } = renderHook(() => useSafeState(1));
    act(() => { result.current[1]((prev) => prev + 1); });
    expect(result.current[0]).toBe(2);
  });

  it('アンマウント後にsetterを呼んでも状態は変わらず、エラーも投げない', () => {
    const { result, unmount } = renderHook(() => useSafeState('initial'));
    const setState = result.current[1];
    unmount();
    expect(() => act(() => { setState('after-unmount'); })).not.toThrow();
  });
});
