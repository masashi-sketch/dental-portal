"use client";

import { useState } from "react";

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="block bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-700 whitespace-pre-wrap break-all">
      {children}
    </code>
  );
}

export function Steps({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-800 mb-2">{title}</p>
      <ol className="list-decimal list-inside text-sm text-slate-700 leading-relaxed flex flex-col gap-1.5 pl-1">
        {children}
      </ol>
    </div>
  );
}

export type SubTabItem = { label: string; content: React.ReactNode; activeClassName?: string };

// カードを縦に積んでスクロールさせるのではなく、タブで1つずつ切り替えて見せるための
// 共通UI。QR自己登録の孫項目切り替え（BGJ社内/医院様/患者様/システム手順のトップ
// レベル切り替えはサイドバーのツリーナビゲーションに移行済み）で引き続き使う。
export function SubTabs({ items }: { items: SubTabItem[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4 w-fit flex-wrap">
        {items.map((item, i) => (
          <button
            key={item.label}
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              active === i ? (item.activeClassName ?? "bg-white text-violet-700 shadow-sm") : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4 text-sm text-slate-700 leading-relaxed">{items[active].content}</div>
    </div>
  );
}
