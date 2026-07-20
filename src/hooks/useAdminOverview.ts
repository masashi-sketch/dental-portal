'use client';

import { useCallback, useEffect } from 'react';
import type { AdminOverview } from '@/lib/adminOverview';
import { useSafeState } from '@/hooks/useSafeState';

export function useAdminOverview() {
  const [overview, setOverview] = useSafeState<AdminOverview | null>(null);
  const [loading, setLoading] = useSafeState(true);
  const [error, setError] = useSafeState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.overview) {
        throw new Error(body?.error ?? 'ダッシュボード情報を取得できませんでした');
      }
      setOverview(body.overview as AdminOverview);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setOverview]);

  useEffect(() => { void reload(); }, [reload]);

  return { overview, loading, error, reload };
}
