'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { SalesRepWithMaster } from '@/lib/supabase/types';

// 医院用ポータルの「今どのクリニックとして見るか」の情報を取得する。
// クリニックログイン（clinic-credentials）のみ、セッションのcustomerCodeを唯一の正として使う。
// BGJ職員は得意先を選択する仕組みを廃止したため、常にnullを返す
// （BGJ職員向けの得意先ごとの管理はBGJポータル側で行う）。
export function useActiveClinic() {
  const { data: session, status: sessionStatus } = useSession();
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [salesRep, setSalesRep] = useState<SalesRepWithMaster | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    const code = session?.user?.role === 'clinic' ? session.user.customerCode : null;
    if (!code) {
      setLoaded(true);
      return;
    }
    fetch(`/api/admin/clinic-info?customerCode=${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : { clinic: null }))
      .then((data) => {
        setClinicName(data.clinic?.display_name ?? data.clinic?.name ?? null);
        setSalesRep(data.clinic?.staff ?? null);
      })
      .catch(() => {
        setClinicName(null);
        setSalesRep(null);
      })
      .finally(() => setLoaded(true));
  }, [session, sessionStatus]);

  return { clinicName, salesRep, loaded };
}
