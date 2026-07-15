'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { SalesRepWithMaster } from '@/lib/supabase/types';

function readActiveCustomerCode(): string | null {
  const match = document.cookie.match(/(?:^|; )active-customer-code=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// 医院用ポータルの「今どのクリニックとして見るか」の情報を取得する。
// - クリニックログイン（clinic-credentials）: セッションのcustomerCodeを唯一の正とする（切替不可）
// - BGJ職員（Google）: 従来通り「医院設定」で選んだactive-customer-codeを使う
export function useActiveClinic() {
  const { data: session, status: sessionStatus } = useSession();
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [salesRep, setSalesRep] = useState<SalesRepWithMaster | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    const code = session?.user?.role === 'clinic' ? session.user.customerCode : readActiveCustomerCode();
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
