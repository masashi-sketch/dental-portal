"use client";

import { useState } from "react";
import nextDynamic from "next/dynamic";
import Card from "@/components/ui/Card";

const chartLoading = <p className="text-slate-400 text-sm text-center py-16">グラフを読み込み中...</p>;
const MonthlySalesChart = nextDynamic(() => import("./ReportsCharts").then((m) => m.MonthlySalesChart), { ssr: false, loading: () => chartLoading });
const MonthlyOrdersChart = nextDynamic(() => import("./ReportsCharts").then((m) => m.MonthlyOrdersChart), { ssr: false, loading: () => chartLoading });
const AreaSalesChart = nextDynamic(() => import("./ReportsCharts").then((m) => m.AreaSalesChart), { ssr: false, loading: () => chartLoading });

const byStaff = [
  { name: "山本権兵衛", 売上: 2180, 得意先数: 82, 訪問数: 24 },
  { name: "田中花子", 売上: 1890, 得意先数: 91, 訪問数: 31 },
  { name: "佐藤次郎", 売上: 2050, 得意先数: 75, 訪問数: 28 },
];

const byArea = [
  { area: "東京", 売上: 1960, 得意先数: 78 },
  { area: "大阪", 売上: 1420, 得意先数: 62 },
  { area: "名古屋", 売上: 870, 得意先数: 41 },
  { area: "福岡", 売上: 980, 得意先数: 38 },
  { area: "札幌", 売上: 650, 得意先数: 29 },
];

const topCustomers = [
  { code: "SB-0091", name: "緑が丘歯科", staff: "佐藤次郎", total: 388800, months: 6 },
  { code: "FK-0014", name: "博多デンタルクリニック", staff: "佐藤次郎", total: 324000, months: 6 },
  { code: "TK-0108", name: "駅前歯科医院", staff: "田中花子", total: 259200, months: 6 },
  { code: "OS-0055", name: "海岸歯科医院", staff: "山本権兵衛", total: 291600, months: 6 },
  { code: "FK-0029", name: "天神歯科医院", staff: "佐藤次郎", total: 226800, months: 6 },
];

const VIEWS = ["月次推移", "担当別", "エリア別", "上位得意先"];

export default function ReportsPage() {
  const [view, setView] = useState("月次推移");

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">売上レポート</h1>
          <p className="text-sm text-slate-500 mt-0.5">2026年1月〜6月</p>
        </div>
        <button className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV出力
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "上半期売上合計", value: "¥32,850千", sub: "前年比 +12.3%" },
          { label: "月平均売上", value: "¥5,475千", sub: "6ヶ月平均" },
          { label: "総注文件数", value: "269件", sub: "6ヶ月累計" },
          { label: "平均注文単価", value: "¥122,139", sub: "1件あたり" },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-slate-400 mb-1">{c.label}</p>
            <p className="text-xl font-bold text-violet-700">{c.value}</p>
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

      {/* 月次推移 */}
      {view === "月次推移" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">月次売上（千円）</h3>
            <MonthlySalesChart />
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">月次注文件数</h3>
            <MonthlyOrdersChart />
          </Card>
        </div>
      )}

      {/* 担当別 */}
      {view === "担当別" && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["担当営業", "担当得意先数", "今月売上（千円）", "今月訪問数", "1得意先あたり売上"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byStaff.map((s) => (
                <tr key={s.name} className="border-b border-slate-50 hover:bg-violet-50/30">
                  <td className="px-5 py-4 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-5 py-4 text-slate-600">{s.得意先数}件</td>
                  <td className="px-5 py-4 font-bold text-violet-700">¥{s.売上.toLocaleString()}千</td>
                  <td className="px-5 py-4 text-slate-600">{s.訪問数}回</td>
                  <td className="px-5 py-4 text-slate-600">
                    ¥{Math.round((s.売上 * 1000) / s.得意先数).toLocaleString()}
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
            <h3 className="text-sm font-bold text-slate-700 mb-4">エリア別売上（千円）</h3>
            <AreaSalesChart />
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
                {byArea.map((a) => (
                  <tr key={a.area} className="border-b border-slate-50 hover:bg-violet-50/30">
                    <td className="px-5 py-3 font-semibold text-slate-700">{a.area}</td>
                    <td className="px-5 py-3 text-slate-500">{a.得意先数}件</td>
                    <td className="px-5 py-3 font-bold text-violet-700">¥{a.売上.toLocaleString()}千</td>
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
            <h3 className="text-sm font-bold text-slate-700">上半期 売上上位（TOP5）</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["順位", "得意先コード", "医院名", "担当", "上半期合計", "月平均"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, i) => (
                <tr key={c.code} className="border-b border-slate-50 hover:bg-violet-50/30">
                  <td className="px-5 py-4">
                    <span className={`text-sm font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-slate-400"}`}>
                      {i + 1}位
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-violet-600 font-semibold">{c.code}</td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{c.name}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{c.staff}</td>
                  <td className="px-5 py-4 font-bold text-violet-700">¥{c.total.toLocaleString()}</td>
                  <td className="px-5 py-4 text-slate-500">¥{Math.round(c.total / c.months).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
