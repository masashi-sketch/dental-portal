'use client';

import { useCallback, useEffect } from 'react';
import type { BgjSalesReport } from '@/lib/bgjReports';
import { useSafeState } from '@/hooks/useSafeState';

export function useBgjSalesReport() {
  const [report, setReport] = useSafeState<BgjSalesReport | null>(null);
  const [loading, setLoading] = useSafeState(true);
  const [error, setError] = useSafeState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bgj/sales-report', { cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.report) {
        throw new Error(body?.error ?? 'レポート情報を取得できませんでした');
      }
      setReport(body.report as BgjSalesReport);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setReport]);

  useEffect(() => { void reload(); }, [reload]);

  return { report, loading, error, reload };
}
