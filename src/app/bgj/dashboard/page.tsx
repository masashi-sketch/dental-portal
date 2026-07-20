"use client";

import Link from "next/link";
import nextDynamic from "next/dynamic";
import Card from "@/components/ui/Card";
import { useBgjDashboardOverview } from "@/hooks/useBgjDashboardOverview";

const MonthlySalesChart = nextDynamic(() => import("./MonthlySalesChart"), {
  ssr: false,
  loading: () => <p className="text-slate-400 text-sm text-center py-16">グラフを読み込み中...</p>,
});

const alertColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
};
const alertLabels: Record<string, string> = {
  high: "緊急",
  medium: "注意",
};

function formatYen(amount: number) {
  return `¥${amount.toLocaleString()}`;
}

function formatPct(pct: number | null) {
  if (pct === null) return "—";
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export default function BgjDashboard() {
  const { overview, loading, error } = useBgjDashboardOverview();
  const kpis = overview?.kpis;
  const generatedDate = overview
    ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeZone: "Asia/Tokyo" }).format(new Date(overview.generatedAt))
    : null;

  const kpiCards = [
    {
      label: "総得意先数",
      value: kpis ? `${kpis.totalClinicCount}` : undefined,
      sub: kpis ? `今月 ${kpis.totalClinicCountDelta >= 0 ? "+" : ""}${kpis.totalClinicCountDelta}` : "",
      color: "text-violet-600",
      bg: "bg-violet-50 border-violet-200",
    },
    {
      label: "今月売上合計",
      value: kpis ? formatYen(kpis.currentMonthSalesTotal) : undefined,
      sub: kpis ? `前月比 ${formatPct(kpis.currentMonthSalesGrowthPct)}` : "",
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "要フォロー",
      value: kpis ? `${kpis.followUpCount}件` : undefined,
      sub: "設定した日数以上未注文",
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: "休眠・解約リスク",
      value: kpis ? `${kpis.dormantRiskCount}件` : undefined,
      sub: "設定した日数以上未注文",
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-0.5">{generatedDate ? `${generatedDate}時点 — 全得意先の概況` : "全得意先の概況"}</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border p-4 ${kpi.bg}`}>
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value ?? "—"}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* 売上グラフ */}
        <Card className="lg:col-span-2 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">月次売上推移</h2>
          {overview && <MonthlySalesChart monthlySales={overview.monthlySales} />}
        </Card>

        {/* アラート */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">要フォローアラート</h2>
          <div className="flex flex-col gap-2">
            {loading && <p className="text-sm text-slate-400 py-4 text-center">読み込み中...</p>}
            {!loading && overview?.alerts.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">現在アラートはありません</p>
            )}
            {overview?.alerts.map((a) => (
              <Link key={a.customerCode} href={`/bgj/customers/${a.customerCode}`}
                className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${alertColors[a.level]}`}>
                  {alertLabels[a.level]}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{a.name}</p>
                  <p className="text-xs text-slate-400">{a.customerCode} · {a.issue}</p>
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
              {loading && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">読み込み中...</td></tr>
              )}
              {!loading && overview?.recentOrders.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">注文はまだありません</td></tr>
              )}
              {overview?.recentOrders.map((order) => (
                <tr key={`${order.customerCode}-${order.orderDate}-${order.amount}`} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2.5">
                    <Link href={`/bgj/customers/${order.customerCode}`} className="text-violet-600 hover:underline font-mono text-xs">
                      {order.customerCode}
                    </Link>
                  </td>
                  <td className="py-2.5 text-slate-700">{order.clinicName}</td>
                  <td className="py-2.5 text-slate-500 text-xs">{order.staffName}</td>
                  <td className="py-2.5 text-right font-semibold text-slate-700">{formatYen(order.amount)}</td>
                  <td className="py-2.5 text-right text-slate-400 text-xs">{order.orderDate}</td>
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
          {loading && <p className="text-sm text-slate-400 py-4 text-center">読み込み中...</p>}
          {!loading && overview?.ranking.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">今月の注文実績がまだありません</p>
          )}
          {overview?.ranking.map((c, index) => {
            const rank = index + 1;
            return (
              <Link
                key={c.customerCode}
                href={`/bgj/customers/${c.customerCode}`}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:opacity-90 ${
                  rank === 1 ? 'bg-amber-50 border border-amber-200' :
                  rank === 2 ? 'bg-slate-50 border border-slate-200' :
                  rank === 3 ? 'bg-orange-50 border border-orange-200' :
                  'border border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  rank === 1 ? 'bg-amber-400 text-white' :
                  rank === 2 ? 'bg-slate-400 text-white' :
                  rank === 3 ? 'bg-amber-700 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{c.clinicName}</p>
                  <p className="text-xs text-slate-400">{c.customerCode} · {c.staffName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-700">{formatYen(c.currentMonthAmount)}</p>
                  <p className={`text-xs font-semibold ${c.growthPct !== null && c.growthPct < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {formatPct(c.growthPct)} 前月比
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
