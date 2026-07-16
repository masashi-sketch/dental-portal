'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Clinic, SalesRepWithMaster } from '@/lib/supabase/types';

export type ClinicWithStaff = Clinic & { staff: SalesRepWithMaster | null };

// admin/clinic-info/contract, config, clinic-intro の3ページが個別に持っていた
// 「クリニックロールのcustomerCodeを解決し、自院のclinic-infoを取得する」処理の共通化。
// PATCH成功後は各ページがsetClinicでレスポンスの行をそのままマージし、再取得を避ける。
export function useClinicInfo() {
  const { data: session, status: sessionStatus } = useSession();
  const isClinicRole = session?.user?.role === 'clinic';
  const customerCode = isClinicRole ? session?.user.customerCode ?? '' : '';

  const [clinic, setClinic] = useState<ClinicWithStaff | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'loading' || !isClinicRole || !customerCode) return;
    let cancelled = false;
    fetch(`/api/admin/clinic-info?customerCode=${encodeURIComponent(customerCode)}`)
      .then((res) => (res.ok ? res.json() : { clinic: null }))
      .then((data) => { if (!cancelled) setClinic(data.clinic ?? null); })
      .catch(() => { if (!cancelled) setClinic(null); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [sessionStatus, isClinicRole, customerCode]);

  return { sessionStatus, isClinicRole, customerCode, clinic, setClinic, loaded };
}
