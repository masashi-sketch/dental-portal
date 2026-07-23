'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  endClinicPreview,
  endPatientPreview,
  getPortalCookieStateKey,
  readPortalCookieState,
  subscribePortalCookieState,
} from '@/lib/client/portalState';

const PATIENT_PORTAL_PATHS = ['/home', '/medication', '/shop', '/subscription', '/qa', '/clinic'];

function pathIs(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function closePreview(clear: () => void) {
  clear();
  // scriptで開いたプレビュータブなら閉じる。直接開いたタブではブラウザが
  // window.close()を拒否するが、状態変更イベントによりバナーは即座に消える。
  window.close();
}

export default function PortalModeBanner() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const stateKey = useSyncExternalStore(subscribePortalCookieState, getPortalCookieStateKey, () => '|');
  const state = readPortalCookieState();
  const role = session?.user?.role;

  useEffect(() => {
    if (status !== 'authenticated') return;

    // 代理閲覧Cookieは認証ロールより弱い補助状態。実ユーザーとしてログインした
    // 場合は不整合な状態だけを破棄し、Cookie残留による誤表示・誤スコープを防ぐ。
    if (role === 'clinic' && state.clinicPreviewCustomerCode) endClinicPreview();
    if (role === 'patient') {
      if (state.clinicPreviewCustomerCode) endClinicPreview();
      if (state.patientPreviewId) endPatientPreview();
    }
  }, [role, state.clinicPreviewCustomerCode, state.patientPreviewId, stateKey, status]);

  if (status !== 'authenticated') return null;

  if (role === 'bgj' && pathIs(pathname, '/admin') && state.clinicPreviewCustomerCode) {
    return (
      <div className="bg-amber-400 text-amber-950 text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-3 flex-wrap">
        <span className="font-semibold">
          閲覧モード：得意先コード {state.clinicPreviewCustomerCode} を医院ポータルとして閲覧しています
        </span>
        <button onClick={() => closePreview(endClinicPreview)} className="underline font-semibold hover:opacity-70 transition-opacity whitespace-nowrap">
          閉じる
        </button>
      </div>
    );
  }

  const isPatientPortal = PATIENT_PORTAL_PATHS.some((path) => pathIs(pathname, path));
  if ((role === 'clinic' || role === 'bgj') && isPatientPortal && state.patientPreviewId) {
    return (
      <div className="bg-amber-400 text-amber-950 text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-3 flex-wrap">
        <span className="font-semibold">プレビューモード：管理画面から、この患者様として一時的に表示しています</span>
        <button onClick={() => closePreview(endPatientPreview)} className="underline font-semibold hover:opacity-70 transition-opacity whitespace-nowrap">
          閉じる
        </button>
      </div>
    );
  }

  return null;
}
