'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const navLinks = ['診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

export default function PatientLoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId === 'bgj' && password === 'dsm17938') {
      router.push('/home');
    } else {
      setError('IDまたはパスワードが正しくありません。');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* アナウンスバー */}
      <div className="bg-[#F0F7FF] text-[#2563EB] text-xs text-center py-2 px-4">
        医師監修のもと提供される患者様専用のポータルサービスです
      </div>

      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-gray-900 font-bold text-lg tracking-tight">テストデンタル歯科</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            {navLinks.map((l) => <a key={l} href="#" className="hover:text-[#2563EB] transition-colors">{l}</a>)}
          </nav>
          <button
            className="md:hidden text-gray-500 hover:text-[#2563EB] transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              }
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
            {navLinks.map((l) => (
              <a key={l} href="#" className="block py-3 text-sm text-gray-600 border-b border-gray-50 hover:text-[#2563EB] transition-colors">{l}</a>
            ))}
          </div>
        )}
      </header>

      {/* メイン */}
      <main
        className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 md:py-16 relative overflow-hidden"
        style={{ backgroundImage: 'url(/login-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat' }}
      >
        <div className="absolute inset-0 bg-white/30" />
        <div className="relative z-10 max-w-5xl w-full flex flex-col md:flex-row items-center gap-10 md:gap-16">

          {/* 左：キャッチ */}
          <div className="flex-1 w-full text-center md:text-left">
            <span className="inline-block bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wider">
              Patient Portal
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
              患者様専用<br />
              <span className="text-[#2563EB]">ポータルサイト</span>
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              予約管理・診療情報・定期購入など<br className="hidden sm:block" />
              患者様向けサービスをご利用いただけます。
            </p>
          </div>

          {/* 右：ログインカード */}
          <div className="w-full max-w-sm mx-auto md:mx-0 md:w-[400px] md:max-w-none bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">ログイン</h2>
            <p className="text-gray-400 text-sm mb-6">患者IDとパスワードを入力してください</p>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">患者ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => { setUserId(e.target.value); setError(''); }}
                  placeholder="例）T-00123"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                />
              </div>
              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">{error}</p>
              )}
              <button
                type="submit"
                className="w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#1d4ed8] transition-colors cursor-pointer shadow-sm mt-1"
              >
                ログイン
              </button>
            </form>

            <div className="flex justify-between mt-4 text-xs text-gray-400">
              <a href="#" className="hover:text-[#2563EB] transition-colors">パスワードをお忘れの方</a>
              <a href="#" className="hover:text-[#2563EB] transition-colors">ログインでお困りの方</a>
            </div>

            <p className="text-xs text-center text-gray-300 mt-6">
              他のポータルをお探しの方は{' '}
              <Link href="/auth/signin" className="text-[#2563EB] hover:underline">こちら</Link>
            </p>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col items-center gap-3 text-xs md:flex-row md:justify-between">
          <span className="text-white font-semibold">テストデンタル歯科</span>
          <span className="text-gray-500">© 2026 テストデンタル歯科. All Rights Reserved.</span>
        </div>
      </footer>
    </div>
  );
}
