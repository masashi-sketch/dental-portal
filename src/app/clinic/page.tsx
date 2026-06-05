'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

/* ── アイコン ── */
function IconBell() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
function IconCart() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
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
function IconClinic() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconDashboard() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8" />
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
function IconBag() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function IconQA() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IconMapPin() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

const navItems = [
  { label: 'クリニック紹介', icon: <IconClinic />,   active: true },
  { label: 'ダッシュボード',  icon: <IconDashboard /> },
  { label: '予約・受診履歴', icon: <IconCalendar /> },
  { label: '診療情報',        icon: <IconFile /> },
  { label: 'サブスク',        icon: <IconRefresh /> },
  { label: '単発注文',        icon: <IconBag /> },
  { label: 'Q & A',           icon: <IconQA /> },
];

const headerNavLinks = ['クリニック紹介', '診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

export default function ClinicPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#EAF4FD]">

      {/* ヘッダー */}
      <header className="bg-[#1C6EA4] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="text-base sm:text-lg font-bold tracking-wide">田中デンタル歯科</div>

          {/* デスクトップナビ */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="hover:opacity-75 transition-opacity">{label}</a>
            ))}
          </nav>

          {/* アイコン群 */}
          <div className="flex items-center gap-4">
            <button className="hover:opacity-75 transition-opacity"><IconBell /></button>
            <button className="hover:opacity-75 transition-opacity hidden sm:block"><IconUser /></button>
            <button className="relative hover:opacity-75 transition-opacity hidden sm:block">
              <IconCart />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
            </button>
            {/* ハンバーガー（モバイルのみ） */}
            <button
              className="md:hidden hover:opacity-75 transition-opacity"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="メニュー"
            >
              {menuOpen ? <IconX /> : <IconMenu />}
            </button>
          </div>
        </div>

        {/* モバイルドロップダウンメニュー */}
        {menuOpen && (
          <div className="md:hidden bg-[#155d8e] px-4 pb-4 flex flex-col gap-1 text-sm">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="py-2.5 border-b border-white/10 hover:opacity-75 transition-opacity">
                {label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* モバイル：横スクロールタブナビ */}
      <div className="md:hidden bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-1 px-3 py-2 min-w-max">
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                item.active
                  ? 'bg-[#1C6EA4] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.icon}{item.label}
            </a>
          ))}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <IconLogout />ログアウト
          </Link>
        </div>
      </div>

      {/* ボディ */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 gap-6 sm:gap-8">

        {/* サイドバー（デスクトップのみ） */}
        <aside className="hidden md:block w-48 shrink-0">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  item.active
                    ? 'text-[#1C6EA4] font-semibold bg-white shadow-sm'
                    : 'text-gray-600 hover:bg-white/60'
                }`}
              >
                <span className={item.active ? 'text-[#1C6EA4]' : 'text-gray-400'}>
                  {item.icon}
                </span>
                {item.label}
              </a>
            ))}
            <div className="my-2 h-px bg-gray-200" />
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-white/60 transition-colors"
            >
              <span className="text-gray-400"><IconLogout /></span>
              ログアウト
            </Link>
          </nav>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col gap-4 sm:gap-6 min-w-0">

          {/* 院長プロフィールカード */}
          <div className="bg-white rounded-2xl border border-[#D6EAF8] p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:gap-6">
            {/* アバター */}
            <div className="flex justify-center sm:justify-start shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[#D6EAF8]">
                <Image
                  src="/images/doctor.png"
                  alt="院長 田中一郎"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {/* 情報 */}
            <div className="flex-1 text-center sm:text-left">
              <span className="inline-block bg-[#1C6EA4] text-white text-xs font-medium px-3 py-0.5 rounded-full mb-2">院長</span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">田中　一郎</h2>
              <p className="text-[#1C6EA4] text-xs mb-3">歯学博士 / 日本歯科医師会会員 / 日本歯科保存学会認定医</p>
              <p className="text-gray-600 text-sm leading-relaxed">
                患者様お一人おひとりのお口の健康を、長期的な視点でサポートすることを大切にしています。痛みや不安を感じたときはもちろん、定期的なメンテナンスでも気軽にお越しください。スタッフ一同、安心して通っていただけるクリニックを目指してまいります。皆様のご来院を心よりお待ちしております。
              </p>
            </div>
          </div>

          {/* 下段：診療情報 ＋ アクセス */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

            {/* 診療内容・診療時間 */}
            <div className="bg-white rounded-2xl border border-[#D6EAF8] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[#1C6EA4] font-semibold mb-4">
                <IconClock /><span>診療内容・診療時間</span>
              </div>
              <table className="w-full text-sm mb-4 sm:mb-5">
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['一般歯科', '虫歯・歯周病治療'],
                    ['予防歯科', 'クリーニング・定期検診'],
                    ['審美歯科', 'ホワイトニング'],
                    ['小児歯科', 'お子様の歯科治療'],
                  ].map(([cat, desc]) => (
                    <tr key={cat}>
                      <td className="py-2 text-gray-500 w-20 sm:w-24 text-xs sm:text-sm">{cat}</td>
                      <td className="py-2 text-gray-800 font-medium text-xs sm:text-sm">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-gray-100 pt-4 text-xs sm:text-sm space-y-1.5 text-gray-700">
                {[
                  ['月・火・水・金', '9:00〜18:00'],
                  ['土曜日',        '9:00〜13:00'],
                  ['休診日',        '水・日・祝日'],
                  ['電話番号',      '03-xxxx-xxxx'],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3 sm:gap-4">
                    <span className="text-gray-500 w-20 sm:w-24 shrink-0">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* アクセス */}
            <div className="bg-white rounded-2xl border border-[#D6EAF8] p-5 sm:p-6 flex flex-col">
              <div className="flex items-center gap-2 text-[#1C6EA4] font-semibold mb-4">
                <IconMapPin /><span>アクセス</span>
              </div>
              <div className="text-xs sm:text-sm space-y-3 text-gray-700 flex-1">
                {[
                  ['住所',   '〒xxx-xxxx 東京都〇〇区〇〇1-2-3　〇〇ビル2F'],
                  ['最寄駅', '〇〇線「〇〇駅」徒歩3分'],
                  ['駐車場', '近隣にコインパーキングあり'],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3 sm:gap-4">
                    <span className="text-gray-500 w-14 sm:w-16 shrink-0">{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
              <button className="mt-5 sm:mt-6 w-full border border-[#B8D9F0] text-[#1C6EA4] py-2.5 rounded-lg text-xs sm:text-sm hover:bg-[#EAF4FD] transition-colors flex items-center justify-center gap-2">
                <IconMapPin />地図を表示
              </button>
            </div>

          </div>
        </main>
      </div>

      {/* フッター */}
      <footer className="bg-[#1C6EA4] text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col items-center gap-3 text-xs sm:text-sm md:flex-row md:justify-between">
          <div className="font-bold">田中デンタル歯科</div>
          <div className="text-white/60 text-xs text-center">© 2026 田中デンタル歯科. All Rights Reserved.</div>
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
            <a href="#" className="hover:opacity-75 transition-opacity">プライバシーポリシー</a>
            <a href="#" className="hover:opacity-75 transition-opacity">特定商取引法</a>
            <a href="#" className="hover:opacity-75 transition-opacity">お問い合わせ</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
