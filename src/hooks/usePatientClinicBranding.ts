'use client';

import { useEffect } from 'react';
import { useSafeState } from './useSafeState';
import { DEFAULT_NAV_VISIBILITY, type NavVisibility } from '@/lib/patientNav';

// 患者ポータルのログイン後ページ（home/medication/shop/subscription/qa/clinic）用。
// 実患者セッション、またはスタッフのプレビューモードから、表示すべきクリニック名・
// ナビゲーション表示設定・歯周病表示設定を取得する。
export function usePatientClinicBranding() {
  const [clinicName, setClinicName] = useSafeState<string | null>(null);
  const [navVisibility, setNavVisibility] = useSafeState<NavVisibility>(DEFAULT_NAV_VISIBILITY);
  const [showPeriodontalDiagnosis, setShowPeriodontalDiagnosis] = useSafeState(true);
  const [loaded, setLoaded] = useSafeState(false);

  useEffect(() => {
    fetch('/api/patient-portal/clinic-branding')
      .then((res) => (res.ok ? res.json() : { displayName: null, nav: DEFAULT_NAV_VISIBILITY, showPeriodontalDiagnosis: true }))
      .then((data) => {
        setClinicName(data.displayName ?? null);
        setNavVisibility(data.nav ?? DEFAULT_NAV_VISIBILITY);
        setShowPeriodontalDiagnosis(data.showPeriodontalDiagnosis ?? true);
      })
      .catch(() => {
        setClinicName(null);
        setNavVisibility(DEFAULT_NAV_VISIBILITY);
        setShowPeriodontalDiagnosis(true);
      })
      .finally(() => setLoaded(true));
    // useSafeStateのsetterはuseCallbackで安定しているため、依存配列に含めても再実行は起きない。
  }, [setClinicName, setNavVisibility, setShowPeriodontalDiagnosis, setLoaded]);

  return { clinicName, navVisibility, showPeriodontalDiagnosis, loaded };
}
