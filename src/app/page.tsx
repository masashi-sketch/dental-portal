'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function IconSearch() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64" />
      <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64" />
      <polyline points="21 3 21 9 15 9" /><polyline points="3 21 3 15 9 15" />
    </svg>
  );
}
function IconBag() {
  return (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

const mobileNavLinks = ['診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

const features = [
  { icon: <IconCalendar />, label: '予約管理' },
  { icon: <IconFile />,     label: '診療情報' },
  { icon: <IconRefresh />,  label: '定期購入' },
];

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');
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

      {/* 上部アナウンスバー */}
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

          {/* デスクトップナビ */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            {mobileNavLinks.map((label) => (
              <a key={label} href="#" className="hover:text-[#2563EB] transition-colors">{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-4 text-gray-500">
            <button className="hover:text-[#2563EB] transition-colors"><IconSearch /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
            <button
              className="md:hidden hover:text-[#2563EB] transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <IconX /> : <IconMenu />}
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
            {mobileNavLinks.map((label) => (
              <a key={label} href="#" className="block py-3 text-sm text-gray-600 border-b border-gray-50 hover:text-[#2563EB] transition-colors">
                {label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 md:py-20 bg-gradient-to-b from-[#F8FAFF] to-white">
        <div className="max-w-5xl w-full flex flex-col md:flex-row items-center gap-12 md:gap-20">

          {/* 左：ヒーローエリア */}
          <div className="flex-1 w-full">
            <span className="inline-block bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wider">
              Patient Portal
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-5">
              患者様専用<br />
              <span className="text-[#2563EB]">ポータルサイト</span>
            </h1>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-6 max-w-md">
              ご予約の確認・変更、診療情報の閲覧、歯科用品のご注文など、各種サービスをいつでもご利用いただけます。
            </p>

            {/* お知らせ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 max-w-md">
              <p className="text-xs text-gray-400 font-medium mb-3">お知らせ</p>
              <div className="flex flex-col gap-2.5">
                {[
                  { date: '2026.06.01', tag: '重要', tagColor: 'bg-red-50 text-red-500', text: '夏季休診のご案内（8/13〜8/15）' },
                  { date: '2026.05.20', tag: 'お知らせ', tagColor: 'bg-blue-50 text-blue-500', text: '定期購入サービスがリニューアルしました' },
                  { date: '2026.05.10', tag: 'お知らせ', tagColor: 'bg-gray-50 text-gray-500', text: '新商品「薬用洗口液 500ml」を追加しました' },
                ].map((n) => (
                  <div key={n.text} className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-[11px] text-gray-400 shrink-0 mt-0.5 w-20">{n.date}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${n.tagColor}`}>{n.tag}</span>
                    <p className="text-xs text-gray-700 leading-snug">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 右：ログインカード */}
          <div className="w-full md:w-[400px] bg-white rounded-2xl shadow-xl border border-gray-100 p-5 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">ログイン</h2>
            <p className="text-gray-400 text-sm mb-7">診療番号とパスワードを入力してください</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  ユーザーID（診療番号）
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="例）T-00123"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors placeholder-gray-300 bg-gray-50"
                />
              </div>
              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-[#1d4ed8] transition-colors cursor-pointer shadow-sm"
              >
                ログイン
              </button>
            </form>

            <div className="flex justify-between mt-5 text-xs text-gray-400">
              <a href="#" className="hover:text-[#2563EB] transition-colors">パスワードをお忘れの方</a>
              <a href="#" className="hover:text-[#2563EB] transition-colors">ログインでお困りの方</a>
            </div>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-gray-300 text-xs">または</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <button className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm cursor-pointer">
              初めての方・新規登録はこちら
            </button>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center gap-4 text-xs sm:text-sm md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#2563EB] rounded-md flex items-center justify-center">
              <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-white font-semibold">テストデンタル歯科</span>
          </div>
          <div className="text-gray-500 text-xs">© 2026 テストデンタル歯科. All Rights Reserved.</div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a>
            <a href="#" className="hover:text-white transition-colors">特定商取引法</a>
            <a href="#" className="hover:text-white transition-colors">お問い合わせ</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
