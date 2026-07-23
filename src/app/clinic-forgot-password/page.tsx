'use client';

import { useState } from 'react';
import Link from 'next/link';

// パスワードを忘れた医院スタッフ向けの自己リセット入口。意図的に認証不要
// （src/proxy.tsのisClinicPasswordResetPathで公開許可済み）。
// 担当者IDとメールアドレスの組み合わせが登録済みなら、パスワード再設定メールが届く。
// 登録有無を外部から探れないよう、送信結果はどちらの場合も同じ文言を表示する。
export default function ClinicForgotPasswordPage() {
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!loginId.trim() || !email.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/clinic-password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: loginId.trim(), email: email.trim() }),
      });
    } finally {
      setLoading(false);
      setDone(true);
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
            <h2 className="text-white font-bold text-lg mb-2">送信しました</h2>
            <p className="text-teal-300 text-sm mb-6">
              ご登録の担当者IDとメールアドレスが一致する場合、パスワード再設定用のリンクをお送りしました。メールが届かない場合は、BGJ担当者までお問い合わせください。
            </p>
            <Link href="/clinic-login" className="block w-full bg-teal-500 hover:bg-teal-400 text-white py-3 rounded-xl font-bold transition-colors shadow-sm">
              ログイン画面へ
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-white font-bold text-lg mb-1">パスワードをお忘れですか？</h2>
            <p className="text-teal-300 text-xs mb-6">担当者IDとご登録のメールアドレスを入力してください。再設定用のリンクをお送りします。</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-teal-200 text-sm font-medium mb-1.5">担当者ID</label>
                <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="A＋6桁の担当者ID" className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-colors placeholder-teal-400" />
              </div>
              <div>
                <label className="block text-teal-200 text-sm font-medium mb-1.5">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="例）staff@example.com"
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-colors placeholder-teal-400"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white py-3 rounded-xl font-bold transition-colors shadow-sm mt-1 cursor-pointer"
              >
                {loading ? '送信中…' : '再設定メールを送信'}
              </button>
              <Link href="/clinic-login" className="text-center text-xs text-teal-400/60 hover:text-teal-300">
                ログイン画面へ戻る
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
