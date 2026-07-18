'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import SalesRepAvatar from '@/components/SalesRepAvatar';
import { useActiveClinic } from '@/hooks/useActiveClinic';
import type { ExternalLink, SalesRepWithMaster } from '@/lib/supabase/types';

export type AdminPage = 'dashboard' | 'news' | 'patients' | 'orders' | 'products' | 'commission' | 'campaign' | 'biogaia' | 'clinicContract' | 'clinicConfig' | 'clinicQr' | 'clinicIntro' | 'clinicQa' | 'inquiry';

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
function IconExternal() {
  return <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
}
// LINKマスタ（BGJが自由に追加する外部リンク）はリンクごとに個別アイコンを
// 持てないため、全リンク共通の汎用アイコンを使う。
function IconLink() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
}
function IconMenu() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
}
function IconClose() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function IconSettings() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
function IconChevronRight() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>;
}
function IconClinicInfo() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function IconQA() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}
function IconInquiry() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
}

type LinkNavItem = { type: 'link'; key: AdminPage; label: string; href: string; icon: React.ReactNode; dividerBefore?: boolean };
type GroupNavItem = {
  type: 'group';
  label: string;
  icon: React.ReactNode;
  dividerBefore?: boolean;
  children: { key: AdminPage; label: string; href: string }[];
};

const navItems: (LinkNavItem | GroupNavItem)[] = [
  { type: 'link',  key: 'dashboard',  label: 'ダッシュボード',   href: '/admin/dashboard',   icon: <IconDashboard /> },
  { type: 'link',  key: 'commission', label: 'コミッション管理', href: '/admin/commission',  icon: <IconCommission /> },
  { type: 'link',  key: 'patients',   label: '患者様管理',       href: '/admin/patients',    icon: <IconUsers /> },
  {
    type: 'group',
    label: 'クリニック情報',
    icon: <IconSettings />,
    children: [
      { key: 'clinicContract', label: '医院契約情報', href: '/admin/clinic-info/contract' },
      { key: 'clinicConfig',   label: '医院設定情報', href: '/admin/clinic-info/config' },
      { key: 'clinicQr',       label: 'QR設定',       href: '/admin/clinic-info/qr' },
    ],
  },
  { type: 'link',  key: 'news',       label: 'お知らせ管理',     href: '/admin/news',        icon: <IconBell />, dividerBefore: true },
  { type: 'link',  key: 'clinicIntro', label: 'クリニック紹介',  href: '/admin/clinic-intro', icon: <IconClinicInfo /> },
  { type: 'link',  key: 'clinicQa',   label: 'Q & A',            href: '/admin/qa',          icon: <IconQA /> },
  { type: 'link',  key: 'inquiry',    label: 'お問い合わせ',     href: '/admin/inquiry',     icon: <IconInquiry /> },
  { type: 'link',  key: 'orders',     label: '定期購入管理',     href: '/admin/orders',      icon: <IconRefresh /> },
  { type: 'link',  key: 'products',   label: '商品管理',         href: '/admin/products',    icon: <IconBag /> },
  { type: 'link',  key: 'campaign',   label: 'キャンペーン情報', href: '/admin/campaign',    icon: <IconCampaign />,   dividerBefore: true },
  { type: 'link',  key: 'biogaia',    label: 'バイオガイア通信', href: '/admin/biogaia',     icon: <IconNewsletter /> },
];

function GroupNavRow({
  item,
  active,
  onNavClick,
}: {
  item: GroupNavItem;
  active: AdminPage;
  onNavClick?: () => void;
}) {
  const groupActive = item.children.some((c) => c.key === active);
  const [expanded, setExpanded] = useState(groupActive);

  return (
    <div>
      {item.dividerBefore && (
        <div className="my-2 border-t-4 border-sky-800/70" />
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-lg font-medium transition-colors ${
          groupActive ? 'text-sky-100' : 'text-sky-100/80 hover:bg-sky-800/50 hover:text-white'
        }`}
      >
        <span className={`shrink-0 ${groupActive ? 'text-sky-300' : 'text-sky-300/70'}`}>{item.icon}</span>
        <span className="flex-1 leading-snug text-left">{item.label}</span>
        <span className={`shrink-0 text-sky-300/70 transition-transform ${expanded ? 'rotate-90' : ''}`}>
          <IconChevronRight />
        </span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-0.5 pl-4">
          {item.children.map((child) => (
            <Link
              key={child.key}
              href={child.href}
              onClick={onNavClick}
              className={`flex items-center gap-2 pl-6 pr-3 py-2.5 rounded-xl text-base font-medium transition-colors ${
                active === child.key
                  ? 'bg-sky-400/20 text-sky-100'
                  : 'text-sky-100/70 hover:bg-sky-800/50 hover:text-white'
              }`}
            >
              <span className="flex-1 leading-snug">{child.label}</span>
              {active === child.key && <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NavItems({
  active,
  onNavClick,
  unreadCounts,
  externalLinks,
}: {
  active: AdminPage;
  onNavClick?: () => void;
  unreadCounts: Map<AdminPage, number>;
  externalLinks: ExternalLink[];
}) {
  return (
    <>
      <p className="text-sky-300/60 text-xs font-semibold tracking-widest px-3 pb-2">MENU</p>
      {navItems.map((item) => {
        if (item.type === 'group') {
          return <GroupNavRow key={item.label} item={item} active={active} onNavClick={onNavClick} />;
        }

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

      {externalLinks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-sky-800/50">
          <p className="text-sky-300/60 text-xs font-semibold tracking-widest px-3 pb-2">LINKS</p>
          {externalLinks.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-lg font-medium text-sky-100/80 hover:bg-sky-800/50 hover:text-white transition-colors"
            >
              <span className="text-sky-300/70 shrink-0"><IconLink /></span>
              {/* 折り返して全体表示（truncate なし） */}
              <span className="flex-1 leading-snug">{item.label}</span>
              <span className="text-sky-400/60 shrink-0"><IconExternal /></span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function LogoBlock({ clinicName }: { clinicName: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 bg-sky-400 rounded-lg flex items-center justify-center shrink-0">
        <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-white font-bold text-base leading-tight truncate">{clinicName ?? 'テストデンタル'}</p>
        <p className="text-sky-300/80 text-xs">管理ポータル</p>
      </div>
    </div>
  );
}

function SalesRepCard({ salesRep, loaded }: { salesRep: SalesRepWithMaster | null; loaded: boolean }) {
  if (!loaded) return null;

  if (!salesRep) {
    return (
      <div className="shadow-xl rounded-xl overflow-hidden">
        <div className="bg-sky-800/60 border border-teal-500/40 rounded-xl overflow-hidden p-4 text-center">
          <p className="text-teal-200 text-xs font-bold tracking-widest mb-2">── 営業担当 ──</p>
          <p className="text-sky-200/70 text-xs leading-relaxed">クリニックとしてログインすると、担当者が表示されます</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shadow-xl rounded-xl overflow-hidden">
      <div className="bg-sky-800/60 border border-teal-500/40 rounded-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-teal-600/40 px-3 py-2 border-b border-teal-500/40">
          <p className="text-teal-200 text-xs font-bold tracking-widest text-center">── 営業担当 ──</p>
        </div>
        {/* 担当者名・顔写真 */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-3">
          <SalesRepAvatar name={salesRep.name} photoUrl={salesRep.photo_url} size={44} className="text-lg" />
          <div className="min-w-0">
            <p className="text-white font-bold text-lg leading-tight truncate">{salesRep.name}</p>
            <p className="text-teal-300 text-xs font-semibold mt-0.5">{salesRep.role?.name || '—'}</p>
          </div>
        </div>
        {/* 電話番号 */}
        <div className="px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sky-100">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 text-teal-300"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            <span className="font-bold text-base tracking-wide">{salesRep.phone || '—'}</span>
          </div>
        </div>
        {/* お問い合わせ（枠の中、最下部） */}
        <a
          href={salesRep.email ? `mailto:${salesRep.email}` : undefined}
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
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const { clinicName, salesRep, loaded: clinicLoaded } = useActiveClinic();

  const fetchExternalLinks = useCallback(() => {
    fetch('/api/bgj/external-links')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ externalLinks: [] })))
      .then((data) => setExternalLinks(data.externalLinks ?? []))
      .catch(() => setExternalLinks([]));
  }, []);

  useEffect(() => {
    fetchExternalLinks();
  }, [fetchExternalLinks]);

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
    // localStorageの同期読み取りはSSR時に実行不可なため、マウント後・active変更後に
    // 反映する。hydration mismatchを避けるため、あえてクライアント側のeffectでのみ反映する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        onClick={() => { onNavClick?.(); document.cookie = "portal-selected=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; signOut({ callbackUrl: '/auth/signin' }); }}
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
          <LogoBlock clinicName={clinicName} />
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <NavItems active={active} unreadCounts={unreadCounts} externalLinks={externalLinks} />
        </nav>
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
        <p className="text-white font-bold text-base truncate">{clinicName ?? 'テストデンタル'} 管理ポータル</p>
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
          <LogoBlock clinicName={clinicName} />
          <button
            onClick={() => setMobileOpen(false)}
            className="text-sky-300 hover:text-white p-1 rounded-lg hover:bg-sky-800 transition-colors ml-2 shrink-0"
            aria-label="メニューを閉じる"
          >
            <IconClose />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <NavItems active={active} onNavClick={() => setMobileOpen(false)} unreadCounts={unreadCounts} externalLinks={externalLinks} />
        </nav>
        {portalSection(() => setMobileOpen(false))}
        {logoutSection(() => setMobileOpen(false))}
      </aside>

      {/* ── 営業担当カード：画面右下に常時固定 ── */}
      <div className="fixed bottom-4 right-4 z-50 w-56">
        <SalesRepCard salesRep={salesRep} loaded={clinicLoaded} />
      </div>
    </>
  );
}
