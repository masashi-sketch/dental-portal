'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

// useStateと同じ使い方だが、コンポーネントがアンマウントされた後は setState を
// 何もしない。ページ遷移直後に古いfetchが解決してsetStateが呼ばれる
// race conditionを防ぐ（マウント時にfetchする各種カスタムフックで使う）。
export function useSafeState<T>(initialValue: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(initialValue);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((value: SetStateAction<T>) => {
    if (mountedRef.current) setState(value);
  }, []);

  return [state, safeSetState];
}
