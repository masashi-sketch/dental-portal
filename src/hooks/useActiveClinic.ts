'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSafeState } from './useSafeState';
import type { SalesRepWithMaster } from '@/lib/supabase/types';
import { effectiveAdminCustomerCode } from '@/lib/auth/effectiveAdminCustomerCode';
import { requestClinicInfo } from '@/lib/client/clinicInfoRequest';

// 医院用ポータルの「今どのクリニックとして見るか」の情報を取得する。
// クリニックログイン（clinic-credentials）はセッションのcustomerCodeを使う。
// BGJ職員は得意先を選択する仕組みを廃止したが、得意先詳細ページの
// 「医院ポータルを開く（ビュー）」経由ではタブ固有の署名付きプレビュー対象
// （effectiveAdminCustomerCode参照）にフォールバックする。
export function useActiveClinic() {
  const { data: session, status: sessionStatus } = useSession();
  const [clinicName, setClinicName] = useSafeState<string | null>(null);
  const [salesRep, setSalesRep] = useSafeState<SalesRepWithMaster | null>(null);
  const [fetchDone, setFetchDone] = useSafeState(false);

  const code = effectiveAdminCustomerCode(session);

  useEffect(() => {
    if (sessionStatus === 'loading' || !code) return;
    requestClinicInfo(code)
      .then((clinic) => {
        setClinicName(clinic?.display_name ?? clinic?.name ?? null);
        setSalesRep(clinic?.staff ?? null);
      })
      .catch(() => {
        setClinicName(null);
        setSalesRep(null);
      })
      .finally(() => setFetchDone(true));
    // useSafeStateのsetterはuseCallbackで安定しているため、依存配列に含めても再実行は起きない。
  }, [code, sessionStatus, setClinicName, setSalesRep, setFetchDone]);

  // clinicロール以外は取得対象がないため、sessionが確定した時点で読み込み完了とする
  const loaded = sessionStatus !== 'loading' && (!code || fetchDone);

  return { clinicName, salesRep, loaded };
}
