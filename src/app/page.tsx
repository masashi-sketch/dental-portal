'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import Link from 'next/link';

const DEFAULT_CLINIC_NAME = 'デンタルポータル';
const DEFAULT_BACKGROUND = '/patient-login-bg.jpg';
const LAST_CLINIC_COOKIE = 'patient-last-clinic';

function setPortalCookie() {
  document.cookie = 'portal-selected=true; path=/; SameSite=Lax';
}

function readLastClinicCode(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LAST_CLINIC_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function PatientLoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clinicName, setClinicName] = useState(DEFAULT_CLINIC_NAME);
  const [backgroundUrl, setBackgroundUrl] = useState(DEFAULT_BACKGROUND);
  const router = useRouter();

  useEffect(() => {
    const code = readLastClinicCode();
    if (!code) return;
    fetch(`/api/clinics/${encodeURIComponent(code)}/branding`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.displayName) setClinicName(data.displayName);
        if (data?.backgroundUrl) setBackgroundUrl(data.backgroundUrl);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    if (!userId.trim() || !password.trim()) {
      setError('ログインIDとパスワードを入力してください。');
      return;
    }
    setLoading(true);
    setError('');

    const result = await signIn('patient-credentials', {
      loginId: userId,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setLoading(false);
      setError('ログインIDまたはパスワードが正しくありません。');
      return;
    }

    setPortalCookie();
    const session = await getSession();
    if (session?.user?.customerCode) {
      document.cookie = `${LAST_CLINIC_COOKIE}=${encodeURIComponent(session.user.customerCode)}; path=/; max-age=31536000; SameSite=Lax`;
    }
    router.push('/home');
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat' }}
    >
      <div className="absolute inset-0 bg-gray-900/50" />

      {/* ヘッダー：医院名のみ */}
      <header className="relative z-10 border-b border-white/20 sticky top-0">
        <div className="px-6 py-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center shrink-0">
            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-white font-bold text-2xl sm:text-4xl md:text-6xl tracking-tight">{clinicName}</span>
        </div>
      </header>

      {/* メイン：タイトル上・カード中央 */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10">

        {/* タイトル */}
        <div className="text-center mb-8">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wider">
            Patient Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            患者様専用<br className="sm:hidden" />ポータルサイト
          </h1>
        </div>

        {/* ログインカード */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">ログイン</h2>
          <p className="text-gray-400 text-sm mb-6">ログインIDとパスワードを入力してください</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ログインID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="例）yamada01"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#1d4ed8] disabled:opacity-60 transition-colors cursor-pointer shadow-sm mt-1"
            >
              {loading ? 'ログイン中…' : 'ログイン'}
            </button>
          </div>

          <div className="flex justify-between mt-4 text-xs text-gray-400">
            <Link href="/forgot-password" className="hover:text-[#2563EB] transition-colors">パスワードをお忘れの方</Link>
            <a href="#" className="hover:text-[#2563EB] transition-colors">ログインでお困りの方</a>
          </div>

          <p className="text-xs text-center text-gray-300 mt-5">
            他のポータルは{' '}
            <Link href="/auth/signin" className="text-[#2563EB] hover:underline">こちら</Link>
          </p>
        </div>
      </main>

      {/* フッター */}
      <footer className="relative z-10 bg-gray-900/60 text-gray-400">
        <div className="px-6 py-4 text-center text-xs">
          © 2026 {clinicName}. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
