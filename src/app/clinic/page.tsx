'use client';

import Link from 'next/link';
import { useState } from 'react';
import BottomNav from '../components/BottomNav';

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
function IconHome() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
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
  { label: 'ホーム',         icon: <IconHome />,      href: '/home' },
  { label: 'クリニック紹介', icon: <IconClinic />,   active: true },
  { label: '予約・受診履歴', icon: <IconCalendar /> },
  { label: '診療情報',        icon: <IconFile />,    dividerAfter: true },
  { label: '定期購入',        icon: <IconRefresh />,  href: '/subscription' },
  { label: 'おすすめ商品',   icon: <IconBag />,      href: '/shop' },
  { label: 'Q & A',           icon: <IconQA />,       href: '/qa' },
];

const headerNavLinks = ['クリニック紹介', '診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

const staffList = [
  {
    tab: '院長',
    name: '◯◯　◯◯',
    badge: '院長',
    credentials: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯',
    description: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯',
    gradientFrom: '#2563EB',
    gradientTo: '#60a5fa',
    label: '院長',
    activeTab: 'bg-[#2563EB] text-white',
    inactiveTab: 'bg-[#EFF6FF] text-[#2563EB] hover:bg-[#dbeafe]',
  },
  {
    tab: '歯科衛生士',
    name: '◯◯　◯◯',
    badge: '歯科衛生士',
    credentials: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯',
    description: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯',
    gradientFrom: '#0891b2',
    gradientTo: '#67e8f9',
    label: '衛生士',
    activeTab: 'bg-[#0891b2] text-white',
    inactiveTab: 'bg-[#ECFEFF] text-[#0891b2] hover:bg-[#cffafe]',
  },
  {
    tab: '受付',
    name: '◯◯　◯◯',
    badge: '受付',
    credentials: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯',
    description: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯',
    gradientFrom: '#7c3aed',
    gradientTo: '#c4b5fd',
    label: '受付',
    activeTab: 'bg-[#7c3aed] text-white',
    inactiveTab: 'bg-[#F5F3FF] text-[#7c3aed] hover:bg-[#ede9fe]',
  },
];

export default function ClinicPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 md:pb-0">

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

          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-600">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="hover:text-[#2563EB] transition-colors">{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-4 text-gray-500">
            <button className="hover:text-[#2563EB] transition-colors"><IconBell /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
            <button className="relative hover:text-[#2563EB] transition-colors hidden sm:block">
              <IconCart />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
            </button>
            <button className="md:hidden hover:text-[#2563EB] transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <IconX /> : <IconMenu />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="block py-3 text-sm text-gray-600 border-b border-gray-50 hover:text-[#2563EB] transition-colors">
                {label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ボトムナビ（モバイル） */}
      <BottomNav active="clinic" />

      {/* ボディ */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 gap-6 sm:gap-8">

        {/* サイドバー（デスクトップ） */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <nav className="flex flex-col gap-0.5">
              {navItems.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.href ?? '#'}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      item.active
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={item.active ? 'text-[#2563EB]' : 'text-gray-400'}>{item.icon}</span>
                    {item.label}
                  </Link>
                  {item.dividerAfter && <div className="my-2 h-px bg-gray-100" />}
                </div>
              ))}
              <div className="my-2 h-px bg-gray-100" />
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-400"><IconLogout /></span>
                ログアウト
              </Link>
            </nav>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col gap-5 min-w-0">

          {/* スタッフ紹介カード（タブ切り替え） */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* タブ */}
            <div className="flex gap-2 p-3 bg-gray-50 border-b border-gray-100">
              {staffList.map((staff, i) => (
                <button
                  key={staff.tab}
                  onClick={() => setActiveTab(i)}
                  className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                    activeTab === i ? staff.activeTab : staff.inactiveTab
                  }`}
                >
                  {staff.tab}
                </button>
              ))}
            </div>
            {/* コンテンツ */}
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="flex justify-center sm:justify-start shrink-0">
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex flex-col items-center justify-center shadow-sm gap-0.5"
                  style={{ background: `linear-gradient(to bottom right, ${staffList[activeTab].gradientFrom}, ${staffList[activeTab].gradientTo})` }}
                >
                  <svg width="32" height="32" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-white text-[10px] font-medium opacity-80">{staffList[activeTab].label}</span>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <span className="inline-block bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold px-3 py-0.5 rounded-full mb-2">
                  {staffList[activeTab].badge}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{staffList[activeTab].name}</h2>
                <p className="text-[#2563EB] text-xs mb-3 break-all">{staffList[activeTab].credentials}</p>
                <p className="text-gray-500 text-sm leading-relaxed break-all">{staffList[activeTab].description}</p>
              </div>
            </div>
          </div>

          {/* 診療情報 ＋ アクセス */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* 診療内容・診療時間 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-2 text-[#2563EB] font-semibold mb-4 text-sm">
                <IconClock /><span>診療内容・診療時間</span>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm mb-4">
                <tbody className="divide-y divide-gray-50">
                  {[
                    ['一般歯科', '◯◯・◯◯◯◯'],
                    ['予防歯科', 'クリーニング・定期検診'],
                    ['審美歯科', 'ホワイトニング'],
                    ['小児歯科', 'お子様の歯科治療'],
                  ].map(([cat, desc]) => (
                    <tr key={cat}>
                      <td className="py-2.5 text-gray-400 w-20 sm:w-24 text-xs sm:text-sm">{cat}</td>
                      <td className="py-2.5 text-gray-800 font-medium text-xs sm:text-sm">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <div className="border-t border-gray-50 pt-4 space-y-2 text-xs sm:text-sm">
                {[
                  ['月・火・水・金', '9:00〜18:00'],
                  ['土曜日',        '9:00〜13:00'],
                  ['休診日',        '水・日・祝日'],
                  ['電話番号',      '◯◯-◯◯◯◯-◯◯◯◯'],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4">
                    <span className="text-gray-400 w-24 shrink-0">{label}</span>
                    <span className="font-medium text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* アクセス */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col">
              <div className="flex items-center gap-2 text-[#2563EB] font-semibold mb-4 text-sm">
                <IconMapPin /><span>アクセス</span>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                {[
                  ['住所',   '〒◯◯◯-◯◯◯◯ ◯◯県◯◯市◯◯'],
                  ['最寄駅', '◯◯線「◯◯駅」徒歩◯分'],
                  ['駐車場', '◯◯◯◯◯◯◯◯'],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4">
                    <span className="text-gray-400 w-14 sm:w-16 shrink-0">{label}</span>
                    <span className="text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl overflow-hidden border border-gray-100">
                <iframe
                  src="https://maps.google.com/maps?q=広島県廿日市市宮内郵便局&output=embed&hl=ja&z=16"
                  width="100%"
                  height="220"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="広島県廿日市市宮内郵便局 地図"
                />
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 mt-auto hidden md:block">
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
