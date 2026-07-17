'use client';

import { useState } from 'react';
import Link from 'next/link';

// パスワードを忘れた患者様向けの自己リセット入口。意図的に認証不要
// （src/proxy.tsのisPasswordResetPathで公開許可済み）。
// メールアドレス欄にご登録があれば、パスワード再設定メールが届く（無ければ何も届かない）。
// 登録有無を外部から探れないよう、送信結果はどちらの場合も同じ文言を表示する。
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
    } finally {
      setLoading(false);
      setDone(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
        {done ? (
          <div className="text-center py-2">
            <h2 className="text-lg font-bold text-gray-900 mb-2">送信しました</h2>
            <p className="text-gray-500 text-sm mb-6">
              ご登録のメールアドレスの場合、パスワード再設定用のリンクをお送りしました。メールが届かない場合は、通院先の医院までお問い合わせください。
            </p>
            <Link href="/" className="block w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#1d4ed8] transition-colors">
              ログイン画面へ
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">パスワードをお忘れですか？</h2>
            <p className="text-gray-400 text-sm mb-6">ご登録のメールアドレスを入力してください。再設定用のリンクをお送りします。</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="例）yamada@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#1d4ed8] disabled:opacity-60 transition-colors cursor-pointer shadow-sm mt-1"
              >
                {loading ? '送信中…' : '再設定メールを送信'}
              </button>
              <Link href="/" className="text-center text-xs text-gray-400 hover:text-gray-600">
                ログイン画面へ戻る
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
