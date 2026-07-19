'use client';

import { useEffect } from 'react';
import { useSafeState } from './useSafeState';
import type { ClinicStaff } from '@/lib/supabase/types';

// 患者ポータルの「先生からのおすすめ」演出（home/shop）用。
// クリニックのスタッフ一覧から「院長」を担当医師として選び、見つからない場合は
// 登録順（sort_order）が最初のスタッフにフォールバックする。スタッフが1件も
// いない医院ではnullを返し、呼び出し側で先生カードごと非表示にする想定。
export function usePrimaryDoctor() {
  const [doctor, setDoctor] = useSafeState<ClinicStaff | null>(null);
  const [loaded, setLoaded] = useSafeState(false);

  useEffect(() => {
    fetch('/api/patient-portal/clinic-intro')
      .then((res) => (res.ok ? res.json() : { staff: [] }))
      .then((data) => {
        const staff: ClinicStaff[] = data.staff ?? [];
        setDoctor(staff.find((s) => s.role_label.includes('院長')) ?? staff[0] ?? null);
      })
      .catch(() => {
        setDoctor(null);
      })
      .finally(() => setLoaded(true));
    // useSafeStateのsetterはuseCallbackで安定しているため、依存配列に含めても再実行は起きない。
  }, [setDoctor, setLoaded]);

  return { doctor, loaded };
}
