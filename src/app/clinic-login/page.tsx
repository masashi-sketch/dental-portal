'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function setPortalCookie() {
  document.cookie = 'portal-selected=true; path=/; SameSite=Lax';
}

export default function ClinicLoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!loginId.trim() || !password.trim()) {
      setError('ログインIDとパスワードを入力してください。');
      return;
    }
    setLoading(true);
    setError('');

    const result = await signIn('clinic-credentials', {
      loginId,
      password,
      redirect: false,
    });

    setLoading(false);
    if (!result || result.error) {
      setError('ログインIDまたはパスワードが正しくありません。');
      return;
    }

    setPortalCookie();
    router.push('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-gradient-to-br from-teal-950 via-emerald-900 to-teal-800">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/20">
            <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold">医院用ポータル</h1>
          <p className="text-teal-300 text-sm mt-1">歯科医院専用ログイン</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-7 border border-white/20 shadow-2xl">
          <h2 className="text-white font-bold text-lg mb-1">医院スタッフログイン</h2>
          <p className="text-teal-300 text-xs mb-6">発行されたログインID・パスワードでログインしてください</p>

          {error && (
            <div className="bg-red-500/20 border border-red-400/40 text-red-100 text-sm rounded-xl px-4 py-2.5 mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-teal-200 text-sm font-medium mb-1.5">ログインID</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-colors placeholder-teal-400"
              />
            </div>
            <div>
              <label className="block text-teal-200 text-sm font-medium mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-colors placeholder-teal-400"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white py-3 rounded-xl font-bold transition-colors shadow-sm mt-1 cursor-pointer"
            >
              {loading ? 'ログイン中…' : 'ログイン'}
            </button>
          </div>

          <div className="flex justify-center mt-4">
            <Link href="/clinic-forgot-password" className="text-xs text-teal-400/60 hover:text-teal-300 transition-colors">パスワードをお忘れの方</Link>
          </div>

          <p className="text-xs text-center text-teal-400/60 mt-3">
            他のポータルは{' '}
            <Link href="/auth/signin" className="text-teal-300 hover:underline">こちら</Link>
          </p>
        </div>

        <p className="text-center text-teal-400/40 text-xs mt-6">
          © 2026 バイオガイア株式会社. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
