'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import Link from 'next/link';
import { markPortalSelected, resetTransientPortalState } from '@/lib/client/portalState';
import { PORTAL_COOKIE } from '@/lib/portalCookies';

const LAST_CLINIC_COOKIE = PORTAL_COOKIE.lastClinic;

// 初回登録メール本文のリンクからのワンクリックログイン専用ページ。
// トークンはpatients.login_idやsignup_slugと違い、この1ページでしか使わない
// （得意先コードのURL経由での推測可能性とは無関係の、使い捨て・短期限トークン）。
function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  // tokenの有無は初回レンダー時点でURLから決まるため、初期値として直接算出する
  // （react-hooks/set-state-in-effectを避ける）。
  const [status, setStatus] = useState<'checking' | 'error'>(token ? 'checking' : 'error');

  useEffect(() => {
    if (!token) return;

    signIn('patient-magiclink', { token, redirect: false }).then(async (result) => {
      if (!result || result.error) {
        setStatus('error');
        return;
      }
      resetTransientPortalState();
      markPortalSelected();
      const session = await getSession();
      if (session?.user?.customerCode) {
        document.cookie = `${LAST_CLINIC_COOKIE}=${encodeURIComponent(session.user.customerCode)}; path=/; max-age=31536000; SameSite=Lax`;
      }
      router.push('/home');
    });
  }, [token, router]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-1">リンクが無効です</h2>
          <p className="text-gray-500 text-sm mb-6">このリンクは期限切れか、既にご利用済みです。通常のログイン画面からお試しください。</p>
          <Link
            href="/"
            className="block w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#1d4ed8] transition-colors"
          >
            ログイン画面へ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      <p className="text-gray-500 text-sm">ログイン中です…</p>
    </div>
  );
}

export default function JoinVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <VerifyContent />
    </Suspense>
  );
}
