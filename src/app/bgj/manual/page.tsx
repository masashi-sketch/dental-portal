"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import { procedureSteps } from "./proceduresData";
import { usageSections } from "./usageData";

// このページのナビゲーションはBGJサイドバーの「マニュアル」ツリー
// （マニュアル→利用マニュアル/システム手順→各項目）が担う。表示内容は
// URLクエリパラメータ（?tab=usage&audience=... / ?tab=procedure&step=... / ?tab=db）
// だけで決まる（ページ内には切り替えUIを持たない）。不正・未指定な値は
// 常に先頭項目にフォールバックする（リダイレクトはしない）。
// 仕様を変更したときは、このページ・src/app/bgj/manual/proceduresData.tsx・
// src/app/bgj/manual/usageData.tsx・src/app/bgj/components/BgjSidebar.tsxの
// navItems（マニュアルのchildren）を一緒に更新すること。
function ManualPageContent() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab = requestedTab === "procedure" ? "procedure" : requestedTab === "db" ? "db" : "usage";

  if (tab === "db") {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-[680px] min-w-0 flex-col p-3 sm:p-4">
        <header className="mb-3 shrink-0">
          <h1 className="text-xl font-bold text-slate-800">マニュアル：DB定義書</h1>
          <p className="mt-0.5 text-sm text-slate-500">医院向け患者注文管理（現行DB・将来拡張・ER図）</p>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <iframe
            className="h-full w-full border-0"
            src="/manuals/clinic-order-db-definition.html?embed=1&v=2#overview"
            title="医院向け患者注文管理 DB定義書"
          />
        </div>
      </div>
    );
  }

  if (tab === "procedure") {
    const step = procedureSteps.find((s) => s.key === searchParams.get("step")) ?? procedureSteps[0];
    return (
      <div className="p-4 sm:p-6 max-w-6xl">
        <header className="mb-5">
          <h1 className="text-xl font-bold text-slate-800">マニュアル：システム手順</h1>
          <p className="text-slate-500 text-sm mt-0.5">{step.label}</p>
        </header>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl mb-4">
          このページは開発・運用を担当する方向けの技術手順です。医院様・患者様にご案内する内容ではありません。
        </div>
        <Card className="p-5">
          <div className="flex flex-col gap-4 text-sm text-slate-700 leading-relaxed">{step.content}</div>
        </Card>
      </div>
    );
  }

  const section = usageSections.find((s) => s.key === searchParams.get("audience")) ?? usageSections[0];
  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">マニュアル：利用マニュアル</h1>
        <p className="text-slate-500 text-sm mt-0.5">{section.label}</p>
      </header>
      <Card className="p-5">
        <div className="flex flex-col gap-4 text-sm text-slate-700 leading-relaxed">{section.content}</div>
      </Card>
    </div>
  );
}

export default function ManualPage() {
  return (
    <Suspense fallback={<div className="p-4 sm:p-6 max-w-6xl" />}>
      <ManualPageContent />
    </Suspense>
  );
}
