"use client";

import Link from "next/link";
import nextDynamic from "next/dynamic";
import Card from "@/components/ui/Card";

const MonthlySalesChart = nextDynamic(() => import("./MonthlySalesChart"), {
  ssr: false,
  loading: () => <p className="text-slate-400 text-sm text-center py-16">グラフを読み込み中...</p>,
});

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

const clinicRanking = [
  { rank: 1, code: "SB-0091", name: "緑が丘歯科",          staff: "佐藤次郎",  monthly: 64800, growth: "+8.2%"  },
  { rank: 2, code: "FK-0014", name: "博多デンタルクリニック", staff: "佐藤次郎",  monthly: 54000, growth: "+3.1%"  },
  { rank: 3, code: "OS-0055", name: "海岸歯科医院",         staff: "山本権兵衛", monthly: 48600, growth: "+12.5%" },
  { rank: 4, code: "TK-0108", name: "駅前歯科医院",         staff: "田中花子",  monthly: 43200, growth: "+2.0%"  },
  { rank: 5, code: "TK-0031", name: "中央歯科クリニック",   staff: "田中花子",  monthly: 32400, growth: "-1.2%"  },
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
        <Card className="lg:col-span-2 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">月次売上推移（千円）</h2>
          <MonthlySalesChart />
        </Card>

        {/* アラート */}
        <Card className="p-5">
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
        </Card>
      </div>

      {/* 最近の注文 */}
      <Card className="p-5">
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
      </Card>

      {/* 医院ランキング */}
      <Card className="p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700">今月の医院ランキング（上位5院）</h2>
          <Link href="/bgj/reports" className="text-xs text-violet-600 hover:text-violet-800 font-semibold">
            全体レポートへ →
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {clinicRanking.map((c) => (
            <Link
              key={c.code}
              href={`/bgj/customers/${c.code}`}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:opacity-90 ${
                c.rank === 1 ? 'bg-amber-50 border border-amber-200' :
                c.rank === 2 ? 'bg-slate-50 border border-slate-200' :
                c.rank === 3 ? 'bg-orange-50 border border-orange-200' :
                'border border-slate-100 hover:bg-slate-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                c.rank === 1 ? 'bg-amber-400 text-white' :
                c.rank === 2 ? 'bg-slate-400 text-white' :
                c.rank === 3 ? 'bg-amber-700 text-white' :
                'bg-slate-200 text-slate-500'
              }`}>
                {c.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                <p className="text-xs text-slate-400">{c.code} · {c.staff}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-700">¥{c.monthly.toLocaleString()}</p>
                <p className={`text-xs font-semibold ${c.growth.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
                  {c.growth} 前月比
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
