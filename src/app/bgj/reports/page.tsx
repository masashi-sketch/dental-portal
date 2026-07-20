"use client";

import { useState } from "react";
import nextDynamic from "next/dynamic";
import Card from "@/components/ui/Card";
import { useBgjSalesReport } from "@/hooks/useBgjSalesReport";
import { toCsvString, downloadCsv } from "@/lib/csv";

const chartLoading = <p className="text-slate-400 text-sm text-center py-16">グラフを読み込み中...</p>;
const MonthlySalesChart = nextDynamic(() => import("./ReportsCharts").then((m) => m.MonthlySalesChart), { ssr: false, loading: () => chartLoading });
const MonthlyOrdersChart = nextDynamic(() => import("./ReportsCharts").then((m) => m.MonthlyOrdersChart), { ssr: false, loading: () => chartLoading });
const AreaSalesChart = nextDynamic(() => import("./ReportsCharts").then((m) => m.AreaSalesChart), { ssr: false, loading: () => chartLoading });

const VIEWS = ["月次推移", "担当別", "エリア別", "上位得意先"] as const;
type View = (typeof VIEWS)[number];

function formatYen(amount: number) {
  return `¥${amount.toLocaleString()}`;
}

function formatPct(pct: number | null) {
  if (pct === null) return "—";
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export default function ReportsPage() {
  const [view, setView] = useState<View>("月次推移");
  const { report, loading, error } = useBgjSalesReport();

  const handleExportCsv = () => {
    if (!report) return;
    if (view === "月次推移") {
      downloadCsv("月次推移.csv", toCsvString(report.monthlyTrend, [
        { key: "label", label: "月" },
        { key: "salesAmount", label: "売上" },
        { key: "orderCount", label: "注文件数" },
      ]));
    } else if (view === "担当別") {
      downloadCsv("担当別.csv", toCsvString(report.byStaff, [
        { key: "staffName", label: "担当営業" },
        { key: "clinicCount", label: "担当得意先数" },
        { key: "currentMonthSales", label: "今月売上" },
        { key: "currentMonthVisitCount", label: "今月訪問数" },
        { key: "salesPerClinic", label: "1得意先あたり売上" },
      ]));
    } else if (view === "エリア別") {
      downloadCsv("エリア別.csv", toCsvString(report.byArea, [
        { key: "area", label: "エリア" },
        { key: "clinicCount", label: "得意先数" },
        { key: "currentMonthSales", label: "今月売上" },
      ]));
    } else {
      const rows = report.topClinics.map((c, i) => ({ rank: i + 1, ...c }));
      downloadCsv("上位得意先.csv", toCsvString(rows, [
        { key: "rank", label: "順位" },
        { key: "customerCode", label: "得意先コード" },
        { key: "name", label: "医院名" },
        { key: "staffName", label: "担当" },
        { key: "totalSales", label: "期間合計" },
        { key: "monthlyAvgSales", label: "月平均" },
      ]));
    }
  };

  const summaryCards = [
    { label: "対象期間売上合計", value: report ? formatYen(report.summary.totalSales) : undefined, sub: report ? `前年比 ${formatPct(report.summary.yoySalesGrowthPct)}` : "" },
    { label: "月平均売上", value: report ? formatYen(report.summary.monthlyAvgSales) : undefined, sub: "期間平均" },
    { label: "総注文件数", value: report ? `${report.summary.totalOrderCount}件` : undefined, sub: "期間累計" },
    { label: "平均注文単価", value: report ? (report.summary.avgOrderValue !== null ? formatYen(report.summary.avgOrderValue) : "—") : undefined, sub: "1件あたり" },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">売上レポート</h1>
          <p className="text-sm text-slate-500 mt-0.5">{report?.period.label ?? "集計期間を読み込み中..."}</p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={!report}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV出力
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {summaryCards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-slate-400 mb-1">{c.label}</p>
            <p className="text-xl font-bold text-violet-700">{c.value ?? "—"}</p>
            <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
          </Card>
        ))}
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {VIEWS.map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              view === v ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {v}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-400 py-8 text-center">読み込み中...</p>}

      {!loading && report && (
        <>
          {/* 月次推移 */}
          {view === "月次推移" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">月次売上</h3>
                <MonthlySalesChart monthlyTrend={report.monthlyTrend} />
              </Card>
              <Card className="p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">月次注文件数</h3>
                <MonthlyOrdersChart monthlyTrend={report.monthlyTrend} />
              </Card>
            </div>
          )}

          {/* 担当別 */}
          {view === "担当別" && (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["担当営業", "担当得意先数", "今月売上", "今月訪問数", "1得意先あたり売上"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.byStaff.map((s) => (
                    <tr key={s.staffId ?? "unassigned"} className="border-b border-slate-50 hover:bg-violet-50/30">
                      <td className="px-5 py-4 font-semibold text-slate-800">{s.staffName}</td>
                      <td className="px-5 py-4 text-slate-600">{s.clinicCount}件</td>
                      <td className="px-5 py-4 font-bold text-violet-700">{formatYen(s.currentMonthSales)}</td>
                      <td className="px-5 py-4 text-slate-600">{s.currentMonthVisitCount}回</td>
                      <td className="px-5 py-4 text-slate-600">
                        {s.salesPerClinic !== null ? formatYen(s.salesPerClinic) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* エリア別 */}
          {view === "エリア別" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">エリア別売上</h3>
                <AreaSalesChart byArea={report.byArea} />
              </Card>
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["エリア", "得意先数", "今月売上"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.byArea.map((a) => (
                      <tr key={a.area} className="border-b border-slate-50 hover:bg-violet-50/30">
                        <td className="px-5 py-3 font-semibold text-slate-700">{a.area}</td>
                        <td className="px-5 py-3 text-slate-500">{a.clinicCount}件</td>
                        <td className="px-5 py-3 font-bold text-violet-700">{formatYen(a.currentMonthSales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* 上位得意先 */}
          {view === "上位得意先" && (
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-700">期間中 売上上位（TOP5）</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["順位", "得意先コード", "医院名", "担当", "期間合計", "月平均"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.topClinics.map((c, i) => (
                    <tr key={c.customerCode} className="border-b border-slate-50 hover:bg-violet-50/30">
                      <td className="px-5 py-4">
                        <span className={`text-sm font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-slate-400"}`}>
                          {i + 1}位
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-violet-600 font-semibold">{c.customerCode}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">{c.name}</td>
                      <td className="px-5 py-4 text-slate-500 text-xs">{c.staffName}</td>
                      <td className="px-5 py-4 font-bold text-violet-700">{formatYen(c.totalSales)}</td>
                      <td className="px-5 py-4 text-slate-500">{formatYen(c.monthlyAvgSales)}</td>
                    </tr>
                  ))}
                  {report.topClinics.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">対象期間の注文実績がありません</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
