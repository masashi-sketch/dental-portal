'use client';

import { useCallback, useState } from 'react';

// フォーム送信・削除確定等の非同期処理が、二重クリック（回線が遅い状況での
// 連打等）で多重実行されるのを防ぐ。処理中はsubmittingがtrueになりボタンの
// disabled等に使え、処理中に再度guard()が呼ばれても何もしない（多重実行しない）。
export function useSubmitGuard() {
  const [submitting, setSubmitting] = useState(false);

  const guard = useCallback(
    (fn: () => Promise<void>) => async () => {
      if (submitting) return;
      setSubmitting(true);
      try {
        await fn();
      } finally {
        setSubmitting(false);
      }
    },
    [submitting],
  );

  return { submitting, guard };
}
