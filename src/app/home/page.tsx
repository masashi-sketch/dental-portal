'use client';

import Link from 'next/link';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import BottomNav from '../components/BottomNav';
import PreviewModeBanner from '@/components/PreviewModeBanner';
import { usePatientClinicBranding } from '@/hooks/usePatientClinicBranding';
import { isPatientNavKeyVisible, type PatientNavKey } from '@/lib/patientNav';

function IconMenu() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>;
}
function IconX() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function IconBell() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function IconUser() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconCart() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
function IconLogout() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}
function IconClinic() {
  return <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function IconCalendar() {
  return <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function IconFile() {
  return <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></svg>;
}
function IconRefresh() {
  return <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}
function IconBag() {
  return <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
function IconQA() {
  return <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}
function IconPill() {
  return <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7Z" /><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" strokeOpacity="0.5" /></svg>;
}
function IconChevron() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>;
}

const navCards: { label: string; desc: string; href: string; icon: React.ReactNode; bg: string; iconBg: string; text: string; border: string; arrow: string; navKey?: PatientNavKey }[] = [
  {
    label: 'クリニック紹介',
    desc: 'スタッフ・診療時間・アクセス',
    href: '/clinic',
    icon: <IconClinic />,
    bg: 'bg-blue-50',
    iconBg: 'bg-[#2563EB]',
    text: 'text-[#2563EB]',
    border: 'border-blue-100',
    arrow: 'text-blue-300',
    navKey: 'clinicInfo',
  },
  {
    label: '予約・受診履歴',
    desc: '予約確認・変更・キャンセル',
    href: '#',
    icon: <IconCalendar />,
    bg: 'bg-indigo-50',
    iconBg: 'bg-indigo-500',
    text: 'text-indigo-600',
    border: 'border-indigo-100',
    arrow: 'text-indigo-300',
    navKey: 'reservation',
  },
  {
    label: '診療情報',
    desc: '診療記録・投薬・検査結果',
    href: '#',
    icon: <IconFile />,
    bg: 'bg-cyan-50',
    iconBg: 'bg-cyan-600',
    text: 'text-cyan-700',
    border: 'border-cyan-100',
    arrow: 'text-cyan-300',
    navKey: 'medicalRecord',
  },
  {
    label: 'お薬の受け取り',
    desc: '処方内容・受け取り状況の確認',
    href: '/medication',
    icon: <IconPill />,
    bg: 'bg-sky-50',
    iconBg: 'bg-sky-600',
    text: 'text-sky-700',
    border: 'border-sky-100',
    arrow: 'text-sky-300',
    navKey: 'medication',
  },
  {
    label: '定期購入',
    desc: 'サブスクリプション管理',
    href: '/subscription',
    icon: <IconRefresh />,
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-500',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
    arrow: 'text-emerald-300',
    navKey: 'subscription',
  },
  {
    label: 'おすすめ商品',
    desc: '厳選オーラルケア用品',
    href: '/shop',
    icon: <IconBag />,
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-500',
    text: 'text-amber-700',
    border: 'border-amber-100',
    arrow: 'text-amber-300',
    navKey: 'shop',
  },
  {
    label: 'Q & A',
    desc: 'よくあるご質問',
    href: '/qa',
    icon: <IconQA />,
    bg: 'bg-violet-50',
    iconBg: 'bg-violet-500',
    text: 'text-violet-700',
    border: 'border-violet-100',
    arrow: 'text-violet-300',
    navKey: 'qa',
  },
];

/* サイドバー用（デスクトップ） */
function IconHomeSm() { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>; }
function IconClinicSm() { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>; }
function IconCalendarSm() { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>; }
function IconFileSm() { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></svg>; }
function IconRefreshSm() { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>; }
function IconBagSm() { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>; }
function IconQASm() { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>; }
function IconPillSm() { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7Z" /><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" strokeOpacity="0.5" /></svg>; }

const sideNavItems: { label: string; icon: React.ReactNode; href: string; active?: boolean; dividerAfter?: boolean; navKey?: PatientNavKey }[] = [
  { label: 'ホーム',         icon: <IconHomeSm />,     href: '/home', active: true, navKey: 'home' },
  { label: 'クリニック紹介', icon: <IconClinicSm />,  href: '/clinic', navKey: 'clinicInfo' },
  { label: '予約・受診履歴', icon: <IconCalendarSm />, href: '#', navKey: 'reservation' },
  { label: '診療情報',       icon: <IconFileSm />,     href: '#', dividerAfter: true, navKey: 'medicalRecord' },
  { label: 'お薬の受け取り', icon: <IconPillSm />,     href: '/medication', dividerAfter: true, navKey: 'medication' },
  { label: '定期購入',       icon: <IconRefreshSm />,  href: '/subscription', navKey: 'subscription' },
  { label: 'おすすめ商品',  icon: <IconBagSm />,      href: '/shop', navKey: 'shop' },
  { label: 'Q & A',          icon: <IconQASm />,       href: '/qa', navKey: 'qa' },
];

const headerNavLinks = ['クリニック紹介', '診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { clinicName, navVisibility } = usePatientClinicBranding();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 md:pb-0">

      <PreviewModeBanner />

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
            <span className="text-gray-900 font-bold text-lg tracking-tight">{clinicName ?? 'デンタルポータル'}</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-600">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="hover:text-[#2563EB] transition-colors">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-gray-500">
            <button className="hover:text-[#2563EB] transition-colors"><IconBell /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
            <button className="relative hover:text-[#2563EB] transition-colors hidden sm:block"><IconCart /></button>
            <button className="md:hidden hover:text-[#2563EB] transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <IconX /> : <IconMenu />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="block py-3 text-sm text-gray-600 border-b border-gray-50 hover:text-[#2563EB] transition-colors">{label}</a>
            ))}
          </div>
        )}
      </header>

      {/* ボディ */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 gap-6 sm:gap-8">

        {/* サイドバー（デスクトップのみ） */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <nav className="flex flex-col gap-0.5">
              {sideNavItems.filter((item) => isPatientNavKeyVisible(item.navKey, navVisibility)).map((item) => (
                <div key={item.label}>
                  <Link href={item.href}
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
              <p className="text-[10px] font-bold text-gray-400 tracking-widest px-3 pt-1 pb-0.5">ポータル切替</p>
              <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-colors">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                医院用ポータル
              </Link>
              <Link href="/bgj-login" className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-colors">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                BGJポータル
              </Link>
              <div className="my-1 h-px bg-gray-100" />
              <button
                onClick={() => { document.cookie = "portal-selected=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; signOut({ callbackUrl: '/auth/signin' }); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-400"><IconLogout /></span>ログアウト
              </button>
            </nav>

            {/* お知らせ */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-medium mb-3 px-1">お知らせ</p>
              <div className="flex flex-col gap-1">
                {[
                  { date: '2026.06.01', tag: '重要', tagColor: 'bg-red-50 text-red-500', text: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯' },
                  { date: '2026.05.20', tag: 'お知らせ', tagColor: 'bg-blue-50 text-blue-500', text: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯' },
                  { date: '2026.05.10', tag: 'お知らせ', tagColor: 'bg-gray-50 text-gray-500', text: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯' },
                ].map((n, i) => (
                  <div key={i} className="flex flex-col gap-1 py-2 border-b border-gray-50 last:border-0 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">{n.date}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${n.tagColor}`}>{n.tag}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-snug break-all">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col gap-5 min-w-0">

          {/* あいさつカード */}
          <div className="bg-gradient-to-r from-[#2563EB] to-[#60a5fa] rounded-2xl p-5 sm:p-6 text-white">
            <p className="text-blue-100 text-sm mb-1">{greeting}、</p>
            <p className="text-xl sm:text-2xl font-bold mb-3">◯◯　◯◯ 様</p>
            <div className="flex items-center gap-3 bg-white/20 rounded-xl px-4 py-3 text-sm">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span>次回のご予約：<span className="font-semibold">◯月◯日（◯）◯◯:◯◯</span></span>
            </div>
          </div>

          {/* メニューカードグリッド */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-3 px-0.5">メニュー</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {navCards.filter((card) => isPatientNavKeyVisible(card.navKey, navVisibility)).map((card) => (
                <Link
                  key={card.label}
                  href={card.href}
                  className={`group flex flex-col gap-3 p-4 sm:p-5 rounded-2xl border ${card.bg} ${card.border} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-95`}
                >
                  {/* アイコン */}
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${card.iconBg} flex items-center justify-center text-white shadow-sm`}>
                    {card.icon}
                  </div>
                  {/* テキスト */}
                  <div className="flex-1">
                    <p className={`font-bold text-sm sm:text-base leading-snug ${card.text}`}>{card.label}</p>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{card.desc}</p>
                  </div>
                  {/* 矢印 */}
                  <div className={`self-end ${card.arrow} group-hover:translate-x-0.5 transition-transform`}>
                    <IconChevron />
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </main>
      </div>

      {/* ボトムナビ（モバイル） */}
      <BottomNav active="home" navVisibility={navVisibility} />

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 mt-auto hidden md:block">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center gap-4 text-xs sm:text-sm md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#2563EB] rounded-md flex items-center justify-center">
              <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </div>
            <span className="text-white font-semibold">{clinicName ?? 'デンタルポータル'}</span>
          </div>
          <div className="text-gray-500 text-xs">© 2026 {clinicName ?? 'デンタルポータル'}. All Rights Reserved.</div>
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
