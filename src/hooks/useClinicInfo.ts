'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Clinic, ClinicIntroInfo, ClinicPatientSettings, SalesRepWithMaster } from '@/lib/supabase/types';

// APIレスポンスはclinics・clinic_patient_settings・clinic_intro_infoを
// フラットにマージした1つのオブジェクトを返すため、型もそれに合わせて合成する。
export type ClinicWithStaff = Clinic & ClinicPatientSettings & ClinicIntroInfo & { staff: SalesRepWithMaster | null };

// admin/clinic-info/contract, config, clinic-intro の3ページが個別に持っていた
// 「クリニックロールのcustomerCodeを解決し、自院のclinic-infoを取得する」処理の共通化。
// PATCH成功後は各ページがsetClinicでレスポンスの行をそのままマージし、再取得を避ける。
//
// onLoadは取得成功時にfetchの.then()内から呼ばれる（refで最新を参照するため
// 依存配列に含めない）。呼び出し側がclinicから編集用フォームstateを初期化する際、
// useEffect(() => { if (!clinic) return; setForm(...) }, [clinic]) のような
// 同期的なsetStateを書かずに済む。
export function useClinicInfo(onLoad?: (clinic: ClinicWithStaff | null) => void) {
  const { data: session, status: sessionStatus } = useSession();
  const isClinicRole = session?.user?.role === 'clinic';
  const customerCode = isClinicRole ? session?.user.customerCode ?? '' : '';

  const [clinic, setClinic] = useState<ClinicWithStaff | null>(null);
  const [loaded, setLoaded] = useState(false);
  const onLoadRef = useRef(onLoad);
  useEffect(() => {
    onLoadRef.current = onLoad;
  });

  useEffect(() => {
    if (sessionStatus === 'loading' || !isClinicRole || !customerCode) return;
    let cancelled = false;
    fetch(`/api/admin/clinic-info?customerCode=${encodeURIComponent(customerCode)}`)
      .then((res) => (res.ok ? res.json() : { clinic: null }))
      .then((data) => {
        if (cancelled) return;
        const next: ClinicWithStaff | null = data.clinic ?? null;
        setClinic(next);
        onLoadRef.current?.(next);
      })
      .catch(() => { if (!cancelled) setClinic(null); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [sessionStatus, isClinicRole, customerCode]);

  return { sessionStatus, isClinicRole, customerCode, clinic, setClinic, loaded };
}
