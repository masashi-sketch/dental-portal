"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ChevronIcon, hasActiveDescendant, isHrefActive, type ChildNavItem, NavItemRow } from "./navTree";

type NavItem = ChildNavItem & {
  dividerAfter?: boolean;
  sectionLabel?: string;
};

const navItems: NavItem[] = [
  {
    label: "ダッシュボード",
    href: "/bgj/dashboard",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  },
  {
    label: "売上レポート",
    href: "/bgj/reports",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    label: "得意先一覧",
    href: "/bgj/customers",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    sectionLabel: "マスタ",
    children: [
      {
        label: "ステータス",
        href: "/bgj/master/statuses",
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      },
    ],
  },
  {
    label: "患者一覧",
    href: "/bgj/patients",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  },
  {
    label: "営業担当",
    href: "/bgj/master/staff",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    children: [
      {
        label: "役職マスタ",
        href: "/bgj/master/roles",
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5.586a1 1 0 01.707.293l6.414 6.414a1 1 0 010 1.414l-7.586 7.586a1 1 0 01-1.414 0l-6.414-6.414A1 1 0 014 11.586V6a3 3 0 013-3z" /></svg>,
      },
      {
        label: "担当エリア",
        href: "/bgj/master/areas",
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      },
    ],
  },
  {
    label: "LINKマスタ",
    href: "/bgj/master/links",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" /></svg>,
  },
  {
    label: "商品マスタ",
    href: "/bgj/master/products",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" /></svg>,
  },
  {
    label: "受注一覧",
    href: "/bgj/orders?view=received",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5h6m-6 4h6m-7 4h8m-8 4h5M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>,
    sectionLabel: "受発注管理",
  },
  {
    label: "発注一覧",
    href: "/bgj/orders?view=purchase",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h13v10H3zM16 10h3l2 3v3h-5zM7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z" /></svg>,
  },
  {
    label: "在庫一覧",
    href: "/bgj/inventory?view=stock",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8-4 8 4-8 4-8-4zm0 0v10l8 4 8-4V7M12 11v10" /></svg>,
    sectionLabel: "在庫管理",
  },
  {
    label: "入出庫履歴",
    href: "/bgj/inventory?view=movements",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-3-3m3 3l-3 3M16 17H4m0 0l3-3m-3 3l3 3" /></svg>,
  },
  {
    label: "システムダッシュボード",
    href: "/bgj/system/dashboard",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M8 17V9m4 8V5m4 12v-6" /></svg>,
    sectionLabel: "システム管理",
    children: [
      { label: "DB管理", href: "/bgj/system/db" },
      { label: "アプリ管理", href: "/bgj/system/apps" },
      { label: "共通マスタ", href: "/bgj/system/settings" },
    ],
  },
  {
    label: "マニュアル",
    href: "/bgj/manual",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
    sectionLabel: "ヘルプ",
    // 「利用マニュアル」「システム手順」のツリーは、ここではなく
    // src/app/bgj/manual/ManualNav.tsx（マニュアル専用の隣接カラム）が持つ。
    // 主サイドバーは「マニュアル」への単純なリンクだけを表示する。
  },
];

type NavGroup = { sectionLabel: string | null; items: NavItem[] };

// sectionLabelを起点にnavItemsを自動的にグループ化し、描画側でグループ単位に
// 枠で囲む。今後navItemsに項目を追加するときの方針：
// ・既存グループ（マスタ／受発注管理／在庫管理／システム管理／ヘルプ）に項目を追加する場合は、
//   そのグループの末尾（次のsectionLabel項目の手前）に、sectionLabelを
//   付けずに追加するだけで自動的に同じ枠に入る。
// ・新しいグループを作る場合は、そのグループの最初の項目にだけ
//   sectionLabelを付ける（以降の項目は付けない）。
// navGroups自体やレンダリング側のコードを手で書き換える必要はない。
const navGroups: NavGroup[] = navItems.reduce<NavGroup[]>((groups, item) => {
  if (item.sectionLabel || groups.length === 0) {
    groups.push({ sectionLabel: item.sectionLabel ?? null, items: [] });
  }
  groups[groups.length - 1].items.push(item);
  return groups;
}, []);

function SidebarContent({
  pathname,
  searchParams,
  userName,
  userEmail,
  onNavClick,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  onNavClick: () => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  return (
    <>
      {/* ロゴ */}
      <div className="px-5 py-5 border-b border-violet-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">BGJポータル</p>
            <p className="text-violet-300 text-xs">バイオガイア Japan</p>
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {navGroups.map((group, groupIndex) => {
          const groupLabel = group.sectionLabel;
          const isCollapsibleGroup = groupLabel === "マスタ"
            || groupLabel === "受発注管理"
            || groupLabel === "在庫管理"
            || groupLabel === "システム管理"
            || groupLabel === "ヘルプ";
          const groupHasActiveItem = group.items.some(
            (item) => isHrefActive(item.href, pathname, searchParams) || hasActiveDescendant(item, pathname, searchParams)
          );
          const hasManualGroupState = !!groupLabel && Object.prototype.hasOwnProperty.call(expandedGroups, groupLabel);
          const groupExpanded = !isCollapsibleGroup || (hasManualGroupState
            ? !!expandedGroups[groupLabel!]
            : groupHasActiveItem);

          return (
            <div
              key={groupIndex}
              className={group.sectionLabel ? "bg-violet-950/40 border border-violet-700/40 rounded-xl p-1.5 mb-2" : undefined}
            >
              {isCollapsibleGroup && groupLabel ? (
                <button
                  type="button"
                  onClick={() => setExpandedGroups((current) => ({
                    ...current,
                    [groupLabel]: !groupExpanded,
                  }))}
                  aria-label={groupExpanded ? `${groupLabel}を閉じる` : `${groupLabel}を開く`}
                  className="flex w-full items-center justify-between px-2 py-1 text-left text-[11px] font-bold tracking-widest text-violet-200 hover:text-white"
                >
                  <span>{groupLabel}</span>
                  <ChevronIcon expanded={groupExpanded} />
                </button>
              ) : group.sectionLabel ? (
                <p className="text-violet-200 text-[11px] font-bold tracking-widest px-2 pt-1 pb-1.5">{group.sectionLabel}</p>
              ) : null}
              {groupExpanded && group.items.map((item) => (
                <NavItemRow
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  searchParams={searchParams}
                  onNavClick={onNavClick}
                  dividerAfter={item.dividerAfter}
                />
              ))}
            </div>
          );
        })}
      </nav>

      {/* ユーザー情報 */}
      <div className="px-3 pt-2 pb-3 border-t border-violet-700/50">
        <div className="bg-violet-800/60 rounded-xl px-3 py-3 mb-2">
          <p className="text-violet-300 text-xs mb-0.5">ログイン中</p>
          <p className="text-white text-sm font-semibold truncate">{userName ?? "—"}</p>
          <p className="text-violet-300 text-xs truncate">{userEmail ?? "—"}</p>
        </div>
        <button
          onClick={() => { document.cookie = "portal-selected=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; signOut({ callbackUrl: "/auth/signin" }); }}
          className="w-full flex items-center justify-center gap-2 text-violet-300 hover:text-white text-sm py-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          ログアウト
        </button>
      </div>
    </>
  );
}

function BgjSidebarShell() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* デスクトップサイドバー */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-violet-900 sticky top-0 h-screen overflow-hidden">
        <SidebarContent pathname={pathname} searchParams={searchParams} userName={session?.user?.name} userEmail={session?.user?.email} onNavClick={closeMobile} />
      </aside>

      {/* モバイルトップバー */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-violet-900 flex items-center px-4 z-30 border-b border-violet-700/50">
        <button onClick={() => setMobileOpen(true)} className="text-white p-1 mr-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <p className="text-white font-bold text-sm">BGJポータル</p>
      </div>

      {/* モバイルドロワー */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={closeMobile} />
          <aside className="relative w-60 bg-violet-900 flex flex-col h-full">
            <SidebarContent pathname={pathname} searchParams={searchParams} userName={session?.user?.name} userEmail={session?.user?.email} onNavClick={closeMobile} />
          </aside>
        </div>
      )}
    </>
  );
}

export default function BgjSidebar() {
  return (
    <Suspense fallback={<div className="hidden md:flex w-60 shrink-0 bg-violet-900 h-screen" />}>
      <BgjSidebarShell />
    </Suspense>
  );
}
