"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "活性" | "休眠" | "解約リスク";

type Customer = {
  code: string;
  name: string;
  area: string;
  staff: string;
  lastOrder: string;
  monthSales: number;
  status: Status;
  chairs: number;
};

const CUSTOMERS: Customer[] = [
  { code: "TK-0031", name: "中央歯科クリニック", area: "東京", staff: "田中花子", lastOrder: "2026-06-05", monthSales: 32400, status: "活性", chairs: 6 },
  { code: "TK-0042", name: "さくら歯科クリニック", area: "東京", staff: "山本権兵衛", lastOrder: "2026-02-12", monthSales: 0, status: "解約リスク", chairs: 4 },
  { code: "TK-0077", name: "青葉デンタルクリニック", area: "東京", staff: "田中花子", lastOrder: "2026-05-01", monthSales: 21600, status: "休眠", chairs: 5 },
  { code: "TK-0108", name: "駅前歯科医院", area: "東京", staff: "田中花子", lastOrder: "2026-06-04", monthSales: 43200, status: "活性", chairs: 8 },
  { code: "OS-0055", name: "海岸歯科医院", area: "大阪", staff: "山本権兵衛", lastOrder: "2026-06-06", monthSales: 48600, status: "活性", chairs: 7 },
  { code: "OS-0072", name: "港南デンタル", area: "大阪", staff: "山本権兵衛", lastOrder: "2026-06-04", monthSales: 21600, status: "活性", chairs: 4 },
  { code: "OS-0118", name: "みなと歯科医院", area: "大阪", staff: "佐藤次郎", lastOrder: "2026-04-10", monthSales: 0, status: "休眠", chairs: 6 },
  { code: "SB-0091", name: "緑が丘歯科", area: "札幌", staff: "佐藤次郎", lastOrder: "2026-06-05", monthSales: 64800, status: "活性", chairs: 10 },
  { code: "SB-0203", name: "ひまわり歯科", area: "札幌", staff: "", lastOrder: "2026-05-20", monthSales: 16200, status: "活性", chairs: 3 },
  { code: "FK-0014", name: "博多デンタルクリニック", area: "福岡", staff: "佐藤次郎", lastOrder: "2026-06-03", monthSales: 54000, status: "活性", chairs: 9 },
  { code: "FK-0029", name: "天神歯科医院", area: "福岡", staff: "佐藤次郎", lastOrder: "2026-06-01", monthSales: 37800, status: "活性", chairs: 6 },
  { code: "NK-0066", name: "名駅デンタルオフィス", area: "名古屋", staff: "田中花子", lastOrder: "2026-05-28", monthSales: 27000, status: "活性", chairs: 5 },
];

const STATUS_STYLE: Record<Status, string> = {
  活性: "bg-emerald-100 text-emerald-700",
  休眠: "bg-amber-100 text-amber-700",
  解約リスク: "bg-red-100 text-red-700",
};

const AREAS = ["すべて", "東京", "大阪", "札幌", "福岡", "名古屋"];
const STAFFS = ["すべて", "山本権兵衛", "田中花子", "佐藤次郎"];
const STATUSES: (Status | "すべて")[] = ["すべて", "活性", "休眠", "解約リスク"];

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("すべて");
  const [staff, setStaff] = useState("すべて");
  const [status, setStatus] = useState<Status | "すべて">("すべて");

  const filtered = CUSTOMERS.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.code.toLowerCase().includes(q) || c.name.includes(q);
    const matchArea = area === "すべて" || c.area === area;
    const matchStaff = staff === "すべて" || c.staff === staff;
    const matchStatus = status === "すべて" || c.status === status;
    return matchSearch && matchArea && matchStaff && matchStatus;
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">得意先一覧</h1>
          <p className="text-sm text-slate-500 mt-0.5">{CUSTOMERS.length}件登録</p>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          新規登録
        </button>
      </div>

      {/* 絞り込み */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="得意先コード・医院名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="col-span-1 sm:col-span-2 lg:col-span-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <select value={area} onChange={(e) => setArea(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
            {AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
          <select value={staff} onChange={(e) => setStaff(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
            {STAFFS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status | "すべて")}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["得意先コード", "医院名", "エリア", "担当営業", "チェア数", "先月売上", "最終注文日", "ステータス", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.code} className="border-b border-slate-50 hover:bg-violet-50/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-violet-600 font-semibold">{c.code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.area}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {c.staff || <span className="text-red-400 font-semibold">未割当</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs text-center">{c.chairs}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">
                    {c.monthSales > 0 ? `¥${c.monthSales.toLocaleString()}` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{c.lastOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/bgj/customers/${c.code}`}
                      className="text-xs text-violet-600 hover:text-violet-800 font-semibold whitespace-nowrap">
                      詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          {filtered.length}件表示（全{CUSTOMERS.length}件）
        </div>
      </div>
    </div>
  );
}
