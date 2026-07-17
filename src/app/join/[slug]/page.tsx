'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

const DEFAULT_CLINIC_NAME = 'デンタルポータル';

// PC等での確認・共有用の簡易版。QRコードが実際に開く先はスマホ専用・
// クリニック指定背景の src/app/join/[slug]/mobile/page.tsx（別ページ、意図的に分離）。
// パスの[slug]は得意先コードとは無関係なランダム文字列（signup_slug）。
// 得意先コードは連番で推測可能なため、URL・リクエストのいずれにも含めない。
//
// 【重要な運用方針】このフォームの入力項目（氏名・パスワード）は、
// join/[slug]/mobile・送信先API（src/app/api/join/[slug]/route.ts）と
// 同じ項目に揃えている。患者様の登録項目を追加・変更する場合は、この3ファイルを
// 必ず連動して更新すること。ログインIDは手入力させない（全クリニック共通の連番を
// DB側で自動採番、schema.sqlのpatients.login_id参照）。登録完了後、発行された
// 値を画面に表示する。
export default function PatientJoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [clinicName, setClinicName] = useState(DEFAULT_CLINIC_NAME);
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [assignedLoginId, setAssignedLoginId] = useState<string | null>(null);
  const [idCopied, setIdCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/join/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.displayName) setClinicName(data.displayName);
      })
      .catch(() => {});
  }, [slug]);

  const handleSubmit = async () => {
    if (!pin.trim() || !name.trim() || !email.trim() || !password) {
      setError('すべての項目を入力してください。');
      return;
    }
    if (password !== passwordConfirm) {
      setError('パスワードが一致しません。');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/join/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim(), name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '登録に失敗しました。');
        return;
      }
      setAssignedLoginId(data.loginId);
    } catch {
      setError('通信エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="px-6 py-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center shrink-0">
            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-gray-900 font-bold text-xl">{clinicName}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          {assignedLoginId ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">登録が完了しました</h2>
              <p className="text-gray-500 text-sm mb-4">
                こちらがあなたのログインIDです。次回以降のログインに必要ですので、必ず控えてください。ご登録のメールアドレス宛にも、そのままログインできるリンク付きのご案内メールをお送りしました。
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-3">
                <span className="font-mono text-lg font-bold text-blue-700 tracking-wider">{assignedLoginId}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(assignedLoginId);
                    setIdCopied(true);
                    setTimeout(() => setIdCopied(false), 2000);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0"
                >
                  {idCopied ? '✓ コピーしました' : 'コピー'}
                </button>
              </div>
              <Link
                href="/"
                className="block w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#1d4ed8] transition-colors"
              >
                ログイン画面へ
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">患者様ポータルの登録</h2>
              <p className="text-gray-400 text-sm mb-6">窓口でお伝えした受付PINを入力してください。ログインIDは登録後に自動で発行されます。</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">受付PIN</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="窓口でお伝えした数字"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">氏名</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例）山田 太郎"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="例）yamada@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                  />
                  <p className="text-xs text-gray-400 mt-1">登録完了メール・パスワード再設定に使います。</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8文字以上"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード（確認）</label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="もう一度入力してください"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#1d4ed8] disabled:opacity-60 transition-colors cursor-pointer shadow-sm mt-1"
                >
                  {loading ? '登録中…' : '登録する'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
