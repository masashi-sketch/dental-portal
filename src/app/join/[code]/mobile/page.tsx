'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

const DEFAULT_CLINIC_NAME = 'デンタルポータル';
const DEFAULT_BACKGROUND = '/patient-login-bg.jpg';

// クリニック共通QR（SignupQrCard）が実際にスマホへ送り込む先の、スマホ専用登録画面。
// /join/[code]（PC等での確認・共有用の簡易版）とは別に、こちらはクリニックの
// 指定背景画像を全面に使い、幅も常にmax-w-md（電話幅）に固定した専用デザイン。
// 送信先API（/api/clinics/[code]/join）は/join/[code]と共通。
//
// 【重要な運用方針】このフォームの入力項目（氏名・ログインID・パスワード）は、
// 医院用ポータルの患者様登録フォーム（src/app/admin/patients/page.tsx）・
// 登録API（src/app/api/admin/patients/route.ts）と同じ項目に揃えている。
// 患者様の登録項目を追加・変更した場合は、このページと/join/[code]/page.tsx・
// 送信先API（src/app/api/clinics/[code]/join/route.ts）も必ず連動して更新すること。
export default function PatientJoinMobilePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [clinicName, setClinicName] = useState(DEFAULT_CLINIC_NAME);
  const [backgroundUrl, setBackgroundUrl] = useState(DEFAULT_BACKGROUND);
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/clinics/${encodeURIComponent(code)}/branding`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.displayName) setClinicName(data.displayName);
        if (data?.backgroundUrl) setBackgroundUrl(data.backgroundUrl);
      })
      .catch(() => {});
  }, [code]);

  const handleSubmit = async () => {
    if (!pin.trim() || !name.trim() || !loginId.trim() || !password) {
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
      const res = await fetch(`/api/clinics/${encodeURIComponent(code)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim(), name: name.trim(), loginId: loginId.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '登録に失敗しました。');
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
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat' }}
    >
      <div className="absolute inset-0 bg-gray-900/55" />

      {/* スマホ専用画面のため、幅は常にmax-w-md（電話幅）に固定する */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-md mx-auto">
        <header className="border-b border-white/20 px-5 py-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center shrink-0">
            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg truncate">{clinicName}</span>
        </header>

        <main className="flex-1 flex flex-col justify-center px-5 py-8">
          <div className="text-center mb-6">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full tracking-wider">
              患者様ポータル 新規登録
            </span>
          </div>

          <div className="w-full bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
            {done ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">登録が完了しました</h2>
                <p className="text-gray-500 text-sm mb-6">設定したログインIDとパスワードでログインしてください。</p>
                <Link
                  href="/"
                  className="block w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#1d4ed8] transition-colors"
                >
                  ログイン画面へ
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">ポータルの登録</h2>
                <p className="text-gray-400 text-sm mb-5">窓口でお伝えした受付PINを入力してください。</p>

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
                      autoComplete="off"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="窓口でお伝えした数字"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">氏名</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="例）山田 太郎"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">希望ログインID</label>
                    <input
                      type="text"
                      autoComplete="username"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder="半角英数字"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8文字以上"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード（確認）</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="もう一度入力してください"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                    />
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-[#2563EB] text-white py-3.5 rounded-xl font-semibold hover:bg-[#1d4ed8] disabled:opacity-60 transition-colors cursor-pointer shadow-sm mt-1"
                  >
                    {loading ? '登録中…' : '登録する'}
                  </button>
                </div>
              </>
            )}
          </div>
        </main>

        <footer className="bg-gray-900/60 text-gray-400">
          <div className="px-5 py-3 text-center text-xs">© 2026 {clinicName}. All Rights Reserved.</div>
        </footer>
      </div>
    </div>
  );
}
