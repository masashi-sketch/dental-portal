"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  dividerAfter?: boolean;
};

const navItems: NavItem[] = [
  {
    label: "ダッシュボード",
    href: "/bgj/dashboard",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  },
  {
    label: "得意先一覧",
    href: "/bgj/customers",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    dividerAfter: true,
  },
  {
    label: "売上レポート",
    href: "/bgj/reports",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    label: "担当・設定",
    href: "/bgj/staff",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
];

export default function BgjSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
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
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
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
        })}
      </nav>

      {/* ユーザー情報 */}
      <div className="px-3 pt-2 pb-3 border-t border-violet-700/50">
        <div className="bg-violet-800/60 rounded-xl px-3 py-3 mb-2">
          <p className="text-violet-300 text-xs mb-0.5">ログイン中</p>
          <p className="text-white text-sm font-semibold truncate">{session?.user?.name ?? "—"}</p>
          <p className="text-violet-300 text-xs truncate">{session?.user?.email ?? "—"}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
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

  return (
    <>
      {/* デスクトップサイドバー */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-violet-900 sticky top-0 h-screen overflow-hidden">
        <SidebarContent />
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
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-violet-900 flex flex-col h-full">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
