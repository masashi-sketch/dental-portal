'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';

export type AdminPage = 'dashboard' | 'news' | 'patients' | 'orders' | 'products' | 'commission' | 'campaign' | 'biogaia';

// モック：未読件数と最終更新日時
const CONTENT_UNREAD: Partial<Record<AdminPage, { updatedAt: string; count: number }>> = {
  campaign: { updatedAt: '2026-06-07T09:00:00', count: 2 },
  biogaia:  { updatedAt: '2026-06-06T18:00:00', count: 3 },
};

function IconDashboard() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
}
function IconBell() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function IconUsers() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function IconRefresh() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}
function IconBag() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
function IconLogout() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}
function IconCommission() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
}
function IconCampaign() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" /><path d="M13 13h8" /><path d="m16 16 3-3-3-3" /><rect x="8" y="13" width="7" height="7" rx="1" /></svg>;
}
function IconNewsletter() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
}
function IconAcademy() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>;
}
function IconResearch() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>;
}
function IconExternal() {
  return <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
}
function IconChildHealth() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z" /><path d="M12 12c-5 0-9 2.5-9 5v1h18v-1c0-2.5-4-5-9-5z" /></svg>;
}
function IconMenu() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
}
function IconClose() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}

const navItems: { key: AdminPage; label: string; href: string; icon: React.ReactNode; dividerBefore?: boolean }[] = [
  { key: 'dashboard',  label: 'ダッシュボード',   href: '/admin/dashboard',   icon: <IconDashboard /> },
  { key: 'news',       label: 'お知らせ管理',     href: '/admin/news',        icon: <IconBell /> },
  { key: 'patients',   label: '患者様管理',       href: '/admin/patients',    icon: <IconUsers /> },
  { key: 'commission', label: 'コミッション管理', href: '/admin/commission',  icon: <IconCommission />, dividerBefore: true },
  { key: 'orders',     label: '定期購入管理',     href: '/admin/orders',      icon: <IconRefresh /> },
  { key: 'products',   label: '商品管理',         href: '/admin/products',    icon: <IconBag /> },
  { key: 'campaign',   label: 'キャンペーン情報', href: '/admin/campaign',    icon: <IconCampaign />,   dividerBefore: true },
  { key: 'biogaia',    label: 'バイオガイア通信', href: '/admin/biogaia',     icon: <IconNewsletter /> },
];

const externalLinks = [
  { label: 'BiogaiaAcademy',    href: 'https://biogaia-academy.jp/?srsltid=AfmBOooyuVnGxUjZSqUif84eLmsf6y8F-hE-UilcU9wz2vTtBTJo6QdN', icon: <IconAcademy /> },
  { label: 'Biogaia学術情報',   href: 'https://reuteri-lab.jp/post/research', icon: <IconResearch /> },
  { label: 'こどもヘルスラボ', href: 'https://childhealth.jp/?srsltid=AfmBOorq5Na8WlWqf7GTOwMNK1Y1Urk_EgwCL0extO5FY_N_gE8SUtkw', icon: <IconChildHealth /> },
];

function NavItems({
  active,
  onNavClick,
  unreadCounts,
}: {
  active: AdminPage;
  onNavClick?: () => void;
  unreadCounts: Map<AdminPage, number>;
}) {
  return (
    <>
      <p className="text-sky-300/60 text-xs font-semibold tracking-widest px-3 pb-2">MENU</p>
      {navItems.map((item) => {
        const count = unreadCounts.get(item.key) ?? 0;
        return (
          <div key={item.key}>
            {item.dividerBefore && (
              <div className="my-2 border-t-4 border-sky-800/70" />
            )}
            <Link
              href={item.href}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-lg font-medium transition-colors ${
                active === item.key
                  ? 'bg-sky-400/20 text-sky-100'
                  : 'text-sky-100/80 hover:bg-sky-800/50 hover:text-white'
              }`}
            >
              <span className={`shrink-0 ${active === item.key ? 'text-sky-300' : 'text-sky-300/70'}`}>
                {item.icon}
              </span>
              {/* テキストは折り返して全体表示 */}
              <span className="flex-1 leading-snug">{item.label}</span>
              {count > 0 ? (
                <span className="min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                  {count}
                </span>
              ) : active === item.key ? (
                <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
              ) : null}
            </Link>
          </div>
        );
      })}

      <div className="mt-4 pt-4 border-t border-sky-800/50">
        <p className="text-sky-300/60 text-xs font-semibold tracking-widest px-3 pb-2">LINKS</p>
        {externalLinks.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-lg font-medium text-sky-100/80 hover:bg-sky-800/50 hover:text-white transition-colors"
          >
            <span className="text-sky-300/70 shrink-0">{item.icon}</span>
            {/* 折り返して全体表示（truncate なし） */}
            <span className="flex-1 leading-snug">{item.label}</span>
            <span className="text-sky-400/60 shrink-0"><IconExternal /></span>
          </a>
        ))}
      </div>
    </>
  );
}

function LogoBlock() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 bg-sky-400 rounded-lg flex items-center justify-center shrink-0">
        <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>
      <div>
        <p className="text-white font-bold text-base leading-tight">テストデンタル</p>
        <p className="text-sky-300/80 text-xs">管理ポータル</p>
      </div>
    </div>
  );
}

function SalesRepCard() {
  return (
    <div className="px-3 pt-3 pb-2 border-t-2 border-sky-700">
      <div className="bg-sky-800/60 border border-teal-500/40 rounded-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-teal-600/40 px-3 py-2 border-b border-teal-500/40">
          <p className="text-teal-200 text-xs font-bold tracking-widest text-center">── 営業担当 ──</p>
        </div>
        {/* 担当者名 */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-white font-bold text-xl leading-tight">山本権兵衛</p>
          <p className="text-teal-300 text-xs font-semibold mt-0.5">歯科衛生士</p>
        </div>
        {/* 電話番号（幅いっぱいに大きく） */}
        <div className="px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sky-100">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 text-teal-300"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            <span className="font-bold text-base tracking-wide">090-xxxx-xxxx</span>
          </div>
          <div className="flex items-center gap-2 text-sky-100">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 text-teal-300"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>
            <span className="font-bold text-base tracking-wide">03-xxxxx-xxxxx</span>
          </div>
        </div>
        {/* お問い合わせ（枠の中、最下部） */}
        <a
          href="mailto:yamamoto@example.com"
          className="flex items-center justify-center gap-2 w-full bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold py-3 transition-colors border-t border-teal-500/40"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          お問い合わせ
        </a>
      </div>
    </div>
  );
}

export default function AdminSidebar({ active }: { active: AdminPage }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Map<AdminPage, number>>(new Map());

  useEffect(() => {
    const counts = new Map<AdminPage, number>();
    for (const page of Object.keys(CONTENT_UNREAD) as AdminPage[]) {
      const data = CONTENT_UNREAD[page]!;
      const lastRead = localStorage.getItem(`admin_lastRead_${page}`);
      if (!lastRead || new Date(lastRead) < new Date(data.updatedAt)) {
        counts.set(page, data.count);
      }
    }
    // 現在のページを既読にする
    if (CONTENT_UNREAD[active] !== undefined) {
      localStorage.setItem(`admin_lastRead_${active}`, new Date().toISOString());
      counts.delete(active);
    }
    setUnreadCounts(counts);
  }, [active]);

  // モバイルトップバー用：未読合計
  const totalUnread = Array.from(unreadCounts.values()).reduce((a, b) => a + b, 0);

  const { data: session } = useSession();

  const portalSection = (onNavClick?: () => void) => (
    <div className="px-3 pt-2 pb-1 border-t border-sky-800/50">
      <p className="text-sky-400/60 text-[10px] font-bold tracking-widest px-3 pt-2 pb-1">ポータル切替</p>
      <Link
        href="/"
        onClick={onNavClick}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-sky-200/80 hover:bg-sky-800/50 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        患者様ポータル
      </Link>
      <Link
        href="/bgj-login"
        onClick={onNavClick}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-sky-200/80 hover:bg-sky-800/50 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        BGJポータル
      </Link>
    </div>
  );

  const logoutSection = (onNavClick?: () => void) => (
    <div className="px-3 py-3 border-t border-sky-800/50">
      <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
        <div className="w-8 h-8 rounded-full bg-sky-400/20 flex items-center justify-center text-sky-300 text-xs font-bold shrink-0">
          {session?.user?.name?.[0] ?? 'U'}
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold truncate">{session?.user?.name ?? '—'}</p>
          <p className="text-sky-300/70 text-[10px] truncate">{session?.user?.email ?? '—'}</p>
        </div>
      </div>
      <button
        onClick={() => { onNavClick?.(); signOut({ callbackUrl: '/auth/signin' }); }}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-sky-100/80 hover:bg-sky-800/50 hover:text-white transition-colors"
      >
        <IconLogout />ログアウト
      </button>
    </div>
  );

  return (
    <>
      {/* ── デスクトップ用サイドバー ── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sky-900 sticky top-0 h-screen overflow-hidden">
        <div className="px-5 py-5 border-b border-sky-800/50">
          <LogoBlock />
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <NavItems active={active} unreadCounts={unreadCounts} />
        </nav>
        <SalesRepCard />
        {portalSection()}
        {logoutSection()}
      </aside>

      {/* ── モバイル用固定トップバー ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-sky-900 h-14 flex items-center px-4 gap-3 shadow-md">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white p-2 -ml-1 rounded-lg hover:bg-sky-800 transition-colors relative"
          aria-label="メニューを開く"
        >
          <IconMenu />
          {totalUnread > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalUnread}
            </span>
          )}
        </button>
        <div className="w-7 h-7 bg-sky-400 rounded-lg flex items-center justify-center shrink-0">
          <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <p className="text-white font-bold text-base truncate">テストデンタル 管理ポータル</p>
      </div>

      {/* ── モバイルドロワー：背景オーバーレイ ── */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── モバイルドロワー：メニュー本体 ── */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-sky-900 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-sky-800/50">
          <LogoBlock />
          <button
            onClick={() => setMobileOpen(false)}
            className="text-sky-300 hover:text-white p-1 rounded-lg hover:bg-sky-800 transition-colors ml-2 shrink-0"
            aria-label="メニューを閉じる"
          >
            <IconClose />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <NavItems active={active} onNavClick={() => setMobileOpen(false)} unreadCounts={unreadCounts} />
        </nav>
        <SalesRepCard />
        {portalSection(() => setMobileOpen(false))}
        {logoutSection(() => setMobileOpen(false))}
      </aside>
    </>
  );
}
