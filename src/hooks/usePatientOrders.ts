'use client';

import { useEffect } from 'react';
import { useSafeState } from './useSafeState';
import type { PatientOrder } from '@/lib/supabase/types';

export function usePatientOrders() {
  const [orders, setOrders] = useSafeState<PatientOrder[]>([]);
  const [loaded, setLoaded] = useSafeState(false);
  const [error, setError] = useSafeState<string | null>(null);

  useEffect(() => {
    fetch('/api/patient-portal/orders')
      .then(async (response) => {
        if (!response.ok) throw new Error('注文情報を取得できませんでした');
        return response.json();
      })
      .then((data) => setOrders(data.orders ?? []))
      .catch(() => setError('受け取り情報を読み込めませんでした。'))
      .finally(() => setLoaded(true));
  }, [setError, setLoaded, setOrders]);

  return { orders, loaded, error };
}
