'use client';

import { useEffect } from 'react';
import { useSafeState } from './useSafeState';

// 患者ポータルの挨拶表示（home）用。本人セッションだけでなく、
// 医院/BGJスタッフによるプレビュー（demo-patient-id）でも
// resolveEffectivePatientId経由で対象患者の氏名を解決する。
export function usePatientProfile() {
  const [name, setName] = useSafeState<string | null>(null);
  const [loaded, setLoaded] = useSafeState(false);

  useEffect(() => {
    fetch('/api/patient-portal/profile')
      .then((res) => (res.ok ? res.json() : { name: null }))
      .then((data) => setName(data.name ?? null))
      .catch(() => setName(null))
      .finally(() => setLoaded(true));
  }, [setName, setLoaded]);

  return { name, loaded };
}
