'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// パスワード再設定メールのリンク先（医院スタッフ用）。意図的に認証不要
// （src/proxy.tsのisClinicPasswordResetPathで公開許可済み）。トークン自体が本人確認の役割を果たす。
function ClinicResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      setError('リンクが無効です。');
      return;
    }
    if (!password || password !== passwordConfirm) {
      setError('パスワードが一致しません。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/clinic-password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '再設定に失敗しました。');
        return;
      }
      setDone(true);
    } catch {
      setError('通信エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-gradient-to-br from-teal-950 via-emerald-900 to-teal-800">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm bg-white/10 backdrop-blur-md rounded-2xl p-7 border border-white/20 shadow-2xl">
        {done ? (
          <div className="text-center py-2">
            <h2 className="text-white font-bold text-lg mb-2">パスワードを再設定しました</h2>
            <p className="text-teal-300 text-sm mb-6">新しいパスワードでログインしてください。</p>
            <Link href="/clinic-login" className="block w-full bg-teal-500 hover:bg-teal-400 text-white py-3 rounded-xl font-bold transition-colors shadow-sm">
              ログイン画面へ
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-white font-bold text-lg mb-1">新しいパスワードを設定</h2>
            <p className="text-teal-300 text-xs mb-6">新しいパスワードを入力してください。</p>

            {error && (
              <div className="bg-red-500/20 border border-red-400/40 text-red-100 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-teal-200 text-sm font-medium mb-1.5">新しいパスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上"
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-colors placeholder-teal-400"
                />
              </div>
              <div>
                <label className="block text-teal-200 text-sm font-medium mb-1.5">新しいパスワード（確認）</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="もう一度入力してください"
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-colors placeholder-teal-400"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white py-3 rounded-xl font-bold transition-colors shadow-sm mt-1 cursor-pointer"
              >
                {loading ? '設定中…' : 'パスワードを再設定する'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ClinicResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-teal-950 via-emerald-900 to-teal-800" />}>
      <ClinicResetPasswordContent />
    </Suspense>
  );
}
