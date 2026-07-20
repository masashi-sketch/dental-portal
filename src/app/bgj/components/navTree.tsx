"use client";

import Link from "next/link";
import { useState } from "react";

export type ChildNavItem = {
  label: string;
  href: string;
  // 深い階層のリーフ項目ではアイコンを省略できる（未指定時は小さいドットで代替）。
  icon?: React.ReactNode;
  // 自分自身を再帰的に持たせることで、何階層でもツリー化できるようにする
  // （例：「マニュアル」→「利用マニュアル」→「医院様へ」の3階層）。
  children?: ChildNavItem[];
};

// dark：主サイドバー（濃い紫背景、BgjSidebar.tsx）。light：白背景の隣接カラム
// （マニュアル専用ツリー、ManualNav.tsx）向けの配色。
export type NavTheme = "dark" | "light";

const THEME_CLASSES: Record<
  NavTheme,
  { active: string; inactive: string; chevron: string; divider: string }
> = {
  dark: {
    active: "bg-white/20 text-white font-semibold shadow-sm",
    inactive: "text-violet-200 hover:bg-white/10 hover:text-white",
    chevron: "text-violet-300/80 hover:text-white",
    divider: "border-violet-700/40",
  },
  light: {
    active: "bg-violet-50 text-violet-700 font-semibold",
    inactive: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    chevron: "text-slate-400 hover:text-slate-700",
    divider: "border-slate-200",
  },
};

export function ChevronIcon({ expanded }: { expanded: boolean }) {
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

// hrefが "/path" か "/path?key=value&..." のどちらでも扱えるようにする。
// クエリを持たないhref（既存の大半の項目）は従来通りパスだけで判定するため、
// 既存項目の挙動は変わらない。
export function isHrefActive(href: string, pathname: string, searchParams: URLSearchParams): boolean {
  const [path, queryString] = href.split("?");
  const pathMatches = pathname === path || pathname.startsWith(path + "/");
  if (!pathMatches) return false;
  if (!queryString) return true;
  const requiredParams = new URLSearchParams(queryString);
  for (const [key, value] of requiredParams) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

export function hasActiveDescendant(item: ChildNavItem, pathname: string, searchParams: URLSearchParams): boolean {
  return (
    item.children?.some(
      (c) => isHrefActive(c.href, pathname, searchParams) || hasActiveDescendant(c, pathname, searchParams)
    ) ?? false
  );
}

// 子項目（何階層でも）を再帰的に描画する。子を持たない項目はシンプルな
// リンク、子を持つ項目は「本体リンク＋開閉トグル」という構成にする
// （トップレベルのNavItemRowと同じ見た目のパターン）。普段は折りたたまれ、
// 開閉トグルをクリックした時・子孫のページを開いている時だけ表示する。
export function ChildNavItemRow({
  item,
  pathname,
  searchParams,
  onNavClick,
  theme = "dark",
}: {
  item: ChildNavItem;
  pathname: string;
  searchParams: URLSearchParams;
  onNavClick: () => void;
  theme?: NavTheme;
}) {
  const isActive = isHrefActive(item.href, pathname, searchParams);
  const childActive = hasActiveDescendant(item, pathname, searchParams);
  const [expanded, setExpanded] = useState(childActive);
  const hasChildren = !!item.children?.length;
  const t = THEME_CLASSES[theme];

  const iconOrDot = item.icon ?? (
    <span className="block w-1.5 h-1.5 rounded-full bg-current opacity-50" aria-hidden />
  );

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        onClick={onNavClick}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${isActive ? t.active : t.inactive}`}
      >
        <span className="shrink-0">{iconOrDot}</span>
        <span className="flex-1 leading-snug">{item.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <div className={`flex items-center rounded-xl text-sm transition-all ${isActive ? t.active : t.inactive}`}>
        <Link href={item.href} onClick={onNavClick} className="flex-1 flex items-center gap-2.5 px-3 py-2 min-w-0">
          <span className="shrink-0">{iconOrDot}</span>
          <span className="flex-1 leading-snug">{item.label}</span>
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? `${item.label}の詳細を閉じる` : `${item.label}の詳細を開く`}
          className={`px-2 py-2 shrink-0 ${t.chevron}`}
        >
          <ChevronIcon expanded={expanded} />
        </button>
      </div>
      {expanded && (
        <div className="flex flex-col gap-0.5 pl-4 mt-0.5">
          {item.children!.map((child) => (
            <ChildNavItemRow
              key={child.href}
              item={child}
              pathname={pathname}
              searchParams={searchParams}
              onNavClick={onNavClick}
              theme={theme}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// トップレベルnavItem用の行。子項目を持たない場合はシンプルなリンク、
// 子項目を持つ場合は「本体リンク＋開閉トグル」を表示する。子項目は普段は
// 折りたたまれて非表示で、開閉トグルをクリックした時、または子孫の
// ページを開いている時だけ表示する。
export function NavItemRow({
  item,
  pathname,
  searchParams,
  onNavClick,
  dividerAfter,
  theme = "dark",
}: {
  item: ChildNavItem;
  pathname: string;
  searchParams: URLSearchParams;
  onNavClick: () => void;
  dividerAfter?: boolean;
  theme?: NavTheme;
}) {
  const isActive = isHrefActive(item.href, pathname, searchParams);
  const childActive = hasActiveDescendant(item, pathname, searchParams);
  const [expanded, setExpanded] = useState(childActive);
  const t = THEME_CLASSES[theme];

  if (!item.children || item.children.length === 0) {
    return (
      <div>
        <Link
          href={item.href}
          onClick={onNavClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? t.active : t.inactive}`}
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="flex-1 leading-snug">{item.label}</span>
        </Link>
        {dividerAfter && <div className={`my-2 border-t ${t.divider}`} />}
      </div>
    );
  }

  return (
    <div>
      <div className={`flex items-center rounded-xl text-sm transition-all ${isActive ? t.active : t.inactive}`}>
        <Link href={item.href} onClick={onNavClick} className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0">
          <span className="shrink-0">{item.icon}</span>
          <span className="flex-1 leading-snug">{item.label}</span>
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? `${item.label}の詳細を閉じる` : `${item.label}の詳細を開く`}
          className={`px-2.5 py-2.5 shrink-0 ${t.chevron}`}
        >
          <ChevronIcon expanded={expanded} />
        </button>
      </div>
      {expanded && (
        <div className="flex flex-col gap-0.5 pl-4 mt-0.5">
          {item.children.map((child) => (
            <ChildNavItemRow
              key={child.href}
              item={child}
              pathname={pathname}
              searchParams={searchParams}
              onNavClick={onNavClick}
              theme={theme}
            />
          ))}
        </div>
      )}
      {dividerAfter && <div className={`my-2 border-t ${t.divider}`} />}
    </div>
  );
}
