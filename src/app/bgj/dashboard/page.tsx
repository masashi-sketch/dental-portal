"use client";

import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const monthlyData = [
  { month: "1月", 全体: 4820, 山本: 1650, 田中: 1420, 佐藤: 1750 },
  { month: "2月", 全体: 5100, 山本: 1780, 田中: 1560, 佐藤: 1760 },
  { month: "3月", 全体: 5680, 山本: 1920, 田中: 1740, 佐藤: 2020 },
  { month: "4月", 全体: 5240, 山本: 1830, 田中: 1580, 佐藤: 1830 },
  { month: "5月", 全体: 5890, 山本: 2050, 田中: 1760, 佐藤: 2080 },
  { month: "6月", 全体: 6120, 山本: 2180, 田中: 1890, 佐藤: 2050 },
];

const alerts = [
  { code: "TK-0042", name: "さくら歯科クリニック", issue: "90日以上注文なし", level: "high" },
  { code: "OS-0118", name: "みなと歯科医院", issue: "60日以上注文なし", level: "medium" },
  { code: "SB-0203", name: "ひまわり歯科", issue: "担当未割当", level: "medium" },
  { code: "TK-0077", name: "青葉デンタルクリニック", issue: "30日以上注文なし", level: "low" },
];

const recentOrders = [
  { code: "OS-0055", name: "海岸歯科医院", date: "2026-06-06", amount: 48600, staff: "山本権兵衛" },
  { code: "TK-0031", name: "中央歯科クリニック", date: "2026-06-05", amount: 32400, staff: "田中花子" },
  { code: "SB-0091", name: "緑が丘歯科", date: "2026-06-05", amount: 64800, staff: "佐藤次郎" },
  { code: "OS-0072", name: "港南デンタル", date: "2026-06-04", amount: 21600, staff: "山本権兵衛" },
  { code: "TK-0108", name: "駅前歯科医院", date: "2026-06-04", amount: 43200, staff: "田中花子" },
];

const kpis = [
  { label: "総得意先数", value: "248", sub: "前月比 +3", color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
  { label: "今月売上合計", value: "¥6,120千", sub: "前月比 +3.9%", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  { label: "要フォロー", value: "12件", sub: "60日以上注文なし", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  { label: "休眠・解約リスク", value: "4件", sub: "90日以上注文なし", color: "text-red-600", bg: "bg-red-50 border-red-200" },
];

const alertColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-sky-100 text-sky-700 border-sky-200",
};
const alertLabels: Record<string, string> = {
  high: "緊急",
  medium: "注意",
  low: "確認",
};

export default function BgjDashboard() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-0.5">2026年6月 — 全得意先の概況</p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border p-4 ${kpi.bg}`}>
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* 売上グラフ */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">月次売上推移（千円）</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} unit="千" />
              <Tooltip formatter={(v: unknown) => `¥${(v as number).toLocaleString()}千`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="全体" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="山本" stroke="#0ea5e9" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="田中" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="佐藤" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* アラート */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">要フォローアラート</h2>
          <div className="flex flex-col gap-2">
            {alerts.map((a) => (
              <Link key={a.code} href={`/bgj/customers/${a.code}`}
                className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${alertColors[a.level]}`}>
                  {alertLabels[a.level]}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{a.name}</p>
                  <p className="text-xs text-slate-400">{a.code} · {a.issue}</p>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/bgj/customers?filter=alert" className="block text-center text-xs text-violet-600 hover:text-violet-800 mt-3 font-semibold">
            すべて見る →
          </Link>
        </div>
      </div>

      {/* 最近の注文 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700">最近の注文</h2>
          <Link href="/bgj/reports" className="text-xs text-violet-600 hover:text-violet-800 font-semibold">
            レポートへ →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left pb-2 font-semibold">得意先コード</th>
                <th className="text-left pb-2 font-semibold">医院名</th>
                <th className="text-left pb-2 font-semibold">担当</th>
                <th className="text-right pb-2 font-semibold">金額</th>
                <th className="text-right pb-2 font-semibold">日付</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.code} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2.5">
                    <Link href={`/bgj/customers/${order.code}`} className="text-violet-600 hover:underline font-mono text-xs">
                      {order.code}
                    </Link>
                  </td>
                  <td className="py-2.5 text-slate-700">{order.name}</td>
                  <td className="py-2.5 text-slate-500 text-xs">{order.staff}</td>
                  <td className="py-2.5 text-right font-semibold text-slate-700">¥{order.amount.toLocaleString()}</td>
                  <td className="py-2.5 text-right text-slate-400 text-xs">{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
