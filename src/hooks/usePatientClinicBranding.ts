'use client';

import { useEffect, useState } from 'react';

// 患者ポータルのログイン後ページ（home/medication/shop/subscription/qa/clinic）用。
// 実患者セッション、またはスタッフのプレビューモードから、表示すべきクリニック名を取得する。
export function usePatientClinicBranding() {
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/patient-portal/clinic-branding')
      .then((res) => (res.ok ? res.json() : { displayName: null }))
      .then((data) => setClinicName(data.displayName ?? null))
      .catch(() => setClinicName(null))
      .finally(() => setLoaded(true));
  }, []);

  return { clinicName, loaded };
}
