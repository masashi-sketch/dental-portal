"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

type ChildNavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  dividerAfter?: boolean;
  sectionLabel?: string;
  // 普段は折りたたまれ、開閉トグルをクリックした時・子項目のページを開いている時
  // だけ表示される子項目（例：「営業担当」配下の「役職マスタ」「担当エリア」）。
  children?: ChildNavItem[];
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
    label: "DB管理",
    href: "/bgj/system/db",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><ellipse cx="12" cy="5" rx="8" ry="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 5v6c0 1.657 3.582 3 8 3s8-1.343 8-3V5M4 11v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" /></svg>,
    sectionLabel: "システム管理",
  },
  {
    label: "アプリ管理",
    href: "/bgj/system/apps",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  },
  {
    label: "共通マスタ",
    href: "/bgj/system/settings",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    label: "マニュアル",
    href: "/bgj/manual",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
    sectionLabel: "ヘルプ",
  },
];

type NavGroup = { sectionLabel: string | null; items: NavItem[] };

// sectionLabelを起点にnavItemsを自動的にグループ化し、描画側でグループ単位に
// 枠で囲む。今後navItemsに項目を追加するときの方針：
// ・既存グループ（マスタ／システム管理／ヘルプ）に項目を追加する場合は、
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

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

// 子項目を持つnavItem用の行。子項目（例：「役職マスタ」「担当エリア」）は
// 普段は折りたたまれて非表示で、開閉トグルをクリックした時、または子項目の
// ページを開いている時だけ表示する。
function NavItemRow({
  item,
  pathname,
  onNavClick,
}: {
  item: NavItem;
  pathname: string;
  onNavClick: () => void;
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const childActive =
    item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")) ?? false;
  const [expanded, setExpanded] = useState(childActive);

  if (!item.children || item.children.length === 0) {
    return (
      <div>
        <Link
          href={item.href}
          onClick={onNavClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            isActive
              ? "bg-white/20 text-white font-semibold shadow-sm"
              : "text-violet-200 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="flex-1 leading-snug">{item.label}</span>
        </Link>
        {item.dividerAfter && <div className="my-2 border-t border-violet-700/40" />}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`flex items-center rounded-xl text-sm transition-all ${
          isActive
            ? "bg-white/20 text-white font-semibold shadow-sm"
            : "text-violet-200 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Link href={item.href} onClick={onNavClick} className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0">
          <span className="shrink-0">{item.icon}</span>
          <span className="flex-1 leading-snug">{item.label}</span>
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? `${item.label}の詳細を閉じる` : `${item.label}の詳細を開く`}
          className="px-2.5 py-2.5 shrink-0 text-violet-300/80 hover:text-white"
        >
          <ChevronIcon expanded={expanded} />
        </button>
      </div>
      {expanded && (
        <div className="flex flex-col gap-0.5 pl-4 mt-0.5">
          {item.children.map((child) => {
            const childIsActive = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavClick}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                  childIsActive
                    ? "bg-white/20 text-white font-semibold shadow-sm"
                    : "text-violet-200/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="shrink-0">{child.icon}</span>
                <span className="flex-1 leading-snug">{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
      {item.dividerAfter && <div className="my-2 border-t border-violet-700/40" />}
    </div>
  );
}

function SidebarContent({
  pathname,
  userName,
  userEmail,
  onNavClick,
}: {
  pathname: string;
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  onNavClick: () => void;
}) {
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
        {navGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className={group.sectionLabel ? "bg-violet-950/40 border border-violet-700/40 rounded-xl p-1.5 mb-2" : undefined}
          >
            {group.sectionLabel && (
              <p className="text-violet-200 text-[11px] font-bold tracking-widest px-2 pt-1 pb-1.5">{group.sectionLabel}</p>
            )}
            {group.items.map((item) => (
              <NavItemRow key={item.href} item={item} pathname={pathname} onNavClick={onNavClick} />
            ))}
          </div>
        ))}
      </nav>

      {/* ポータル切替 */}
      <div className="px-3 pt-2 pb-1 border-t border-violet-700/50">
        <p className="text-violet-400/60 text-[10px] font-bold tracking-widest px-3 pt-2 pb-1">ポータル切替</p>
        <Link
          href="/"
          onClick={onNavClick}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-violet-200/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          患者様ポータル
        </Link>
        <Link
          href="/admin"
          onClick={onNavClick}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-violet-200/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          医院用ポータル
        </Link>
      </div>

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

export default function BgjSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* デスクトップサイドバー */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-violet-900 sticky top-0 h-screen overflow-hidden">
        <SidebarContent pathname={pathname} userName={session?.user?.name} userEmail={session?.user?.email} onNavClick={closeMobile} />
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
            <SidebarContent pathname={pathname} userName={session?.user?.name} userEmail={session?.user?.email} onNavClick={closeMobile} />
          </aside>
        </div>
      )}
    </>
  );
}
