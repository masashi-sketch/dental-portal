"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { type ChildNavItem, NavItemRow } from "../components/navTree";

// マニュアル専用のツリー。以前はBgjSidebar.tsxの「マニュアル」navItemが
// この2項目（利用マニュアル・システム手順、あわせて26項目）を子に持っていたが、
// 主サイドバーの大部分を占領してしまうため、マニュアルページ専用の
// 隣接カラム（src/app/bgj/manual/layout.tsx経由）に切り出した。
const manualNavItems: ChildNavItem[] = [
  {
    label: "利用マニュアル",
    href: "/bgj/manual?tab=usage&audience=bgj",
    children: [
      { label: "BGJ社内の皆様へ", href: "/bgj/manual?tab=usage&audience=bgj" },
      { label: "医院様へ", href: "/bgj/manual?tab=usage&audience=clinic" },
      { label: "患者様へ", href: "/bgj/manual?tab=usage&audience=patient" },
      { label: "患者様のQR自己登録（新機能）", href: "/bgj/manual?tab=usage&audience=qr-signup" },
      { label: "全体の流れ（参考）", href: "/bgj/manual?tab=usage&audience=flow" },
    ],
  },
  {
    label: "システム手順",
    href: "/bgj/manual?tab=procedure&step=0",
    children: [
      { label: "0. 全体構成", href: "/bgj/manual?tab=procedure&step=0" },
      { label: "1. Supabase準備", href: "/bgj/manual?tab=procedure&step=1" },
      { label: "2. 環境変数", href: "/bgj/manual?tab=procedure&step=2" },
      { label: "3. Google OAuth", href: "/bgj/manual?tab=procedure&step=3" },
      { label: "4. デプロイ", href: "/bgj/manual?tab=procedure&step=4" },
      { label: "5. QR自己登録", href: "/bgj/manual?tab=procedure&step=5" },
      { label: "6. ログインIDの自動採番", href: "/bgj/manual?tab=procedure&step=6" },
      { label: "7. 患者様メール文面のカスタマイズ", href: "/bgj/manual?tab=procedure&step=7" },
      { label: "8. ワンクリックログイン・パスワード再設定", href: "/bgj/manual?tab=procedure&step=8" },
      { label: "9. テストとCI", href: "/bgj/manual?tab=procedure&step=9" },
      { label: "10. クリニック問い合わせ→Slack連携", href: "/bgj/manual?tab=procedure&step=10" },
      { label: "11. お知らせ機能", href: "/bgj/manual?tab=procedure&step=11" },
      { label: "12. BGJポータル使い勝手改善（マスタ一覧化・LINKマスタ）", href: "/bgj/manual?tab=procedure&step=12" },
      { label: "13. 得意先ステータスのマスタ化", href: "/bgj/manual?tab=procedure&step=13" },
      { label: "14. システムダッシュボード", href: "/bgj/manual?tab=procedure&step=14" },
      { label: "15. BGJ患者一覧", href: "/bgj/manual?tab=procedure&step=15" },
      { label: "16. 医院スタッフのパスワードリセット", href: "/bgj/manual?tab=procedure&step=16" },
      { label: "17. 商品マスタと医院ごとの表示設定", href: "/bgj/manual?tab=procedure&step=17" },
      { label: "18. 患者注文・受け取り進捗（外部連携前）", href: "/bgj/manual?tab=procedure&step=18" },
      { label: "19. 商品画像アップロード（Supabase Storage）", href: "/bgj/manual?tab=procedure&step=19" },
      { label: "20. BGJダッシュボード・レポートの実データ化", href: "/bgj/manual?tab=procedure&step=20" },
    ],
  },
  {
    label: "DB定義書",
    href: "/bgj/manual?tab=db",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
        <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
      </svg>
    ),
  },
];

function ManualNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const noop = () => {};

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      <p className="text-slate-400 text-[11px] font-bold tracking-widest px-2 pt-1 pb-2">マニュアル</p>
      {manualNavItems.map((item) => (
        <NavItemRow
          key={item.href}
          item={item}
          pathname={pathname}
          searchParams={searchParams}
          onNavClick={noop}
          theme="light"
        />
      ))}
    </nav>
  );
}

export default function ManualNav() {
  return (
    <aside className="w-full md:w-64 md:shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white">
      <Suspense fallback={<div className="p-3" />}>
        <ManualNavContent />
      </Suspense>
    </aside>
  );
}
