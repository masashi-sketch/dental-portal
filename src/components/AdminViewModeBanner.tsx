'use client';

import { useEffect, useState } from 'react';
import { readBgjViewingCustomerCode } from '@/lib/bgjViewingCustomerCode';

export default function AdminViewModeBanner() {
  const [customerCode, setCustomerCode] = useState<string | null>(null);

  useEffect(() => {
    // document.cookieの同期読み取りはSSR時に実行不可なため、マウント後に
    // 反映する。サーバー/クライアント初回レンダリングの不一致（hydration
    // mismatch）を避けるため、あえてクライアント側のeffectでのみ反映する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomerCode(readBgjViewingCustomerCode());
  }, []);

  if (!customerCode) return null;

  const endViewing = () => {
    document.cookie = 'bgj-viewing-customer-code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    window.close();
  };

  return (
    <div className="bg-amber-400 text-amber-950 text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-3 flex-wrap">
      <span className="font-semibold">
        閲覧モード：得意先コード {customerCode} を医院ポータルとして閲覧しています
      </span>
      <button
        onClick={endViewing}
        className="underline font-semibold hover:opacity-70 transition-opacity whitespace-nowrap"
      >
        閉じる
      </button>
    </div>
  );
}
