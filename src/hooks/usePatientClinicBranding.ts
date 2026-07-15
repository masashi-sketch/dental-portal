'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_NAV_VISIBILITY, type NavVisibility } from '@/lib/patientNav';

// 患者ポータルのログイン後ページ（home/medication/shop/subscription/qa/clinic）用。
// 実患者セッション、またはスタッフのプレビューモードから、表示すべきクリニック名・
// ナビゲーション表示設定を取得する。
export function usePatientClinicBranding() {
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [navVisibility, setNavVisibility] = useState<NavVisibility>(DEFAULT_NAV_VISIBILITY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/patient-portal/clinic-branding')
      .then((res) => (res.ok ? res.json() : { displayName: null, nav: DEFAULT_NAV_VISIBILITY }))
      .then((data) => {
        setClinicName(data.displayName ?? null);
        setNavVisibility(data.nav ?? DEFAULT_NAV_VISIBILITY);
      })
      .catch(() => {
        setClinicName(null);
        setNavVisibility(DEFAULT_NAV_VISIBILITY);
      })
      .finally(() => setLoaded(true));
  }, []);

  return { clinicName, navVisibility, loaded };
}
