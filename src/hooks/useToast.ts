'use client';

import { useCallback, useRef, useState } from 'react';

// トースト通知の状態管理のみを共通化する。表示（色・アイコン等）は
// ポータルごとに異なるため、呼び出し側のJSXはそれぞれ維持する。
export function useToast(duration = 2500) {
  const [toast, setToast] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = setTimeout(() => setToast(''), duration);
  }, [duration]);

  return { toast, showToast };
}
