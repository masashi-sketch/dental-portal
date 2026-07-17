'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';

// このページは/auth/signinでBGJポータルを選んだ場合のGoogle OAuth完了後の
// 着地点として使われる（callbackUrl: "/bgj-login"）。以前はスタッフID・パスワードの
// 入力欄が実際には何も検証せず、押すと無条件で/bgj/dashboardへ遷移するだけの
// 見た目だけのフォームだった（実際の認証はGoogle OAuthのみで完結しており、
// このフォームの入力内容は一切使われていなかった）。
// 認証済み（role: bgj）ならそのままダッシュボードへ自動遷移し、未認証なら
// 実際に機能する「Googleでログイン」ボタンを表示するよう修正した。
export default function BgjLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'bgj') {
      router.replace('/bgj/dashboard');
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-gradient-to-br from-violet-950 via-purple-900 to-violet-800">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/20">
            <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold">BGJポータル</h1>
          <p className="text-violet-300 text-sm mt-1">バイオガイア Japan 社員専用</p>
        </div>

        {/* ログインカード */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-7 border border-white/20 shadow-2xl">
          {status === 'authenticated' && session?.user?.role === 'bgj' ? (
            <p className="text-violet-200 text-sm text-center py-4">ダッシュボードに移動しています…</p>
          ) : (
            <>
              <h2 className="text-white font-bold text-lg mb-1">スタッフログイン</h2>
              <p className="text-violet-300 text-xs mb-6">
                <span className="font-semibold">@biogaia.jp</span> のGoogleアカウントでログインしてください
              </p>
              <button
                onClick={() => signIn('google', { callbackUrl: '/bgj/dashboard' })}
                className="w-full bg-violet-500 hover:bg-violet-400 text-white py-3 rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Googleでログイン
              </button>
            </>
          )}

          <p className="text-xs text-center text-violet-400/60 mt-5">
            他のポータルは{' '}
            <Link href="/auth/signin" className="text-violet-300 hover:underline">こちら</Link>
          </p>
        </div>

        <p className="text-center text-violet-400/40 text-xs mt-6">
          © 2026 バイオガイア株式会社. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
