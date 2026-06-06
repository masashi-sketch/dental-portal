'use client';

import Link from 'next/link';

export type AdminPage = 'dashboard' | 'news' | 'patients' | 'orders' | 'products' | 'commission' | 'campaign' | 'biogaia';

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

const navItems: { key: AdminPage; label: string; href: string; icon: React.ReactNode; dividerBefore?: boolean }[] = [
  { key: 'dashboard',  label: 'ダッシュボード',   href: '/admin/dashboard',   icon: <IconDashboard /> },
  { key: 'news',       label: 'お知らせ管理',     href: '/admin/news',        icon: <IconBell /> },
  { key: 'patients',   label: '患者様管理',       href: '/admin/patients',    icon: <IconUsers /> },
  { key: 'commission', label: 'コミッション管理', href: '/admin/commission',  icon: <IconCommission />,  dividerBefore: true },
  { key: 'orders',     label: '定期購入管理',     href: '/admin/orders',      icon: <IconRefresh /> },
  { key: 'products',   label: '商品管理',         href: '/admin/products',    icon: <IconBag /> },
  { key: 'campaign',   label: 'キャンペーン情報', href: '/admin/campaign',    icon: <IconCampaign />,    dividerBefore: true },
  { key: 'biogaia',    label: 'バイオガイア通信', href: '/admin/biogaia',     icon: <IconNewsletter /> },
];

const externalLinks = [
  { label: 'BiogaiaAcademy',  href: 'https://biogaia-academy.jp/?srsltid=AfmBOooyuVnGxUjZSqUif84eLmsf6y8F-hE-UilcU9wz2vTtBTJo6QdN', icon: <IconAcademy /> },
  { label: 'Biogaia学術情報', href: 'https://reuteri-lab.jp/post/research', icon: <IconResearch /> },
  { label: 'チャイルドヘルラボ', href: 'https://childhealth.jp/?srsltid=AfmBOorq5Na8WlWqf7GTOwMNK1Y1Urk_EgwCL0extO5FY_N_gE8SUtkw', icon: <IconChildHealth /> },
];

export default function AdminSidebar({ active }: { active: AdminPage }) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sky-900 min-h-screen">
      {/* ロゴ */}
      <div className="px-5 py-5 border-b border-sky-800/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-sky-400 rounded-lg flex items-center justify-center">
            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">テストデンタル</p>
            <p className="text-sky-300/80 text-xs">管理ポータル</p>
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        <p className="text-sky-300/60 text-xs font-semibold tracking-widest px-3 pb-2">MENU</p>
        {navItems.map((item) => (
          <div key={item.key}>
            {item.dividerBefore && (
              <div className="my-2 border-t-4 border-sky-800/70" />
            )}
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-lg font-medium transition-colors ${
                active === item.key
                  ? 'bg-sky-400/20 text-sky-100'
                  : 'text-sky-100/80 hover:bg-sky-800/50 hover:text-white'
              }`}
            >
              <span className={active === item.key ? 'text-sky-300' : 'text-sky-300/70'}>
                {item.icon}
              </span>
              {item.label}
              {active === item.key && (
                <span className="ml-auto w-2 h-2 rounded-full bg-sky-400" />
              )}
            </Link>
          </div>
        ))}

        {/* 外部リンクセクション */}
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
              <span className="text-sky-300/70">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              <span className="text-sky-400/60 shrink-0"><IconExternal /></span>
            </a>
          ))}
        </div>
      </nav>

      {/* ログアウト */}
      <div className="px-3 py-4 border-t border-sky-800/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-sky-400/20 flex items-center justify-center text-sky-300 text-sm font-bold">
            A
          </div>
          <div>
            <p className="text-white text-sm font-semibold">管理者</p>
            <p className="text-sky-300/70 text-xs">clinic</p>
          </div>
        </div>
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-base text-sky-100/80 hover:bg-sky-800/50 hover:text-white transition-colors"
        >
          <IconLogout />ログアウト
        </Link>
      </div>
    </aside>
  );
}
