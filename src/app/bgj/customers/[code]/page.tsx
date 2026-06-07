"use client";

import { useState } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const salesHistory = [
  { month: "1月", sales: 32400 }, { month: "2月", sales: 43200 },
  { month: "3月", sales: 54000 }, { month: "4月", sales: 48600 },
  { month: "5月", sales: 37800 }, { month: "6月", sales: 48600 },
];

const orderHistory = [
  { date: "2026-06-06", product: "ロイテリ菌タブレット 30錠×12", qty: 3, amount: 48600, status: "出荷済" },
  { date: "2026-05-08", product: "ロイテリ菌タブレット 30錠×12", qty: 2, amount: 32400, status: "出荷済" },
  { date: "2026-04-10", product: "ロイテリ菌ドロップ 5ml×6", qty: 4, amount: 21600, status: "出荷済" },
  { date: "2026-03-15", product: "ロイテリ菌タブレット 30錠×12", qty: 4, amount: 64800, status: "出荷済" },
  { date: "2026-02-20", product: "ロイテリ菌タブレット 30錠×12", qty: 2, amount: 32400, status: "出荷済" },
];

const visitHistory = [
  { date: "2026-06-01", purpose: "定期訪問・在庫確認", memo: "先生より新患が増えている旨。追加注文の可能性あり。", next: "2026-07-01" },
  { date: "2026-05-02", purpose: "勉強会案内", memo: "6月の勉強会へ参加表明いただいた。", next: "2026-06-01" },
  { date: "2026-04-05", purpose: "新製品紹介", memo: "ドロップタイプに興味を示された。サンプルを置いてきた。", next: "2026-05-02" },
];

const clinicInfo = {
  code: "OS-0055",
  name: "海岸歯科医院",
  area: "大阪",
  address: "大阪府大阪市西区海岸通1-2-3",
  tel: "06-1234-5678",
  contact: "院長 山田太郎 先生",
  staff: "山本権兵衛",
  status: "活性",
  since: "2022-04-01",
  // 経営情報
  patientType: "成人・小児混合",
  clinicType: "一般歯科・矯正",
  chairs: 7,
  waitingRoom: "大（20席以上）",
  counselingRoom: true,
  closedDay: "木曜・日曜",
  fullTimeDr: 2,
  partTimeDr: 1,
  hygienist: 4,
  receptionist: 3,
  assistant: 2,
  technician: 0,
  nurse: 0,
  nutritionist: 0,
  childcare: 0,
  mainReferrer: "近隣クリニックからの紹介",
};

const TABS = ["基本情報", "経営情報", "売上・注文", "訪問記録"];

export default function CustomerDetailPage({ params }: { params: { code: string } }) {
  const [activeTab, setActiveTab] = useState("基本情報");
  const [showVisitModal, setShowVisitModal] = useState(false);

  return (
    <div className="p-4 sm:p-6">
      {/* パンくず */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
        <Link href="/bgj/customers" className="hover:text-violet-600">得意先一覧</Link>
        <span>/</span>
        <span className="text-slate-600">{clinicInfo.name}</span>
      </div>

      {/* ヘッダー */}
      <div className="flex flex-wrap items-start justify-between gap-y-3 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-sm text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-lg">
              {clinicInfo.code}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              clinicInfo.status === "活性" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>
              {clinicInfo.status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">{clinicInfo.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{clinicInfo.area} · 担当：{clinicInfo.staff}</p>
        </div>
        <button
          onClick={() => setShowVisitModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          訪問記録を追加
        </button>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 基本情報 */}
      {activeTab === "基本情報" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
            {[
              ["医院名", clinicInfo.name],
              ["得意先コード", clinicInfo.code],
              ["エリア", clinicInfo.area],
              ["住所", clinicInfo.address],
              ["電話番号", clinicInfo.tel],
              ["担当者", clinicInfo.contact],
              ["担当営業", clinicInfo.staff],
              ["取引開始日", clinicInfo.since],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm text-slate-800 font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 経営情報 */}
      {activeTab === "経営情報" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8">
            {[
              ["患者層分類", clinicInfo.patientType],
              ["診療区分", clinicInfo.clinicType],
              ["チェア数", `${clinicInfo.chairs}台`],
              ["待合室規模", clinicInfo.waitingRoom],
              ["カウンセリングルーム", clinicInfo.counselingRoom ? "あり" : "なし"],
              ["休診日", clinicInfo.closedDay],
              ["常勤医師数", `${clinicInfo.fullTimeDr}名`],
              ["非常勤医師数", `${clinicInfo.partTimeDr}名`],
              ["歯科衛生士数", `${clinicInfo.hygienist}名`],
              ["受付・TC数", `${clinicInfo.receptionist}名`],
              ["歯科助手数", `${clinicInfo.assistant}名`],
              ["歯科技工士数", `${clinicInfo.technician}名`],
              ["看護師数", `${clinicInfo.nurse}名`],
              ["管理栄養士数", `${clinicInfo.nutritionist}名`],
              ["保育士数", `${clinicInfo.childcare}名`],
              ["主な紹介者", clinicInfo.mainReferrer],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm text-slate-800 font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 売上・注文 */}
      {activeTab === "売上・注文" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">月次売上推移（円）</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={salesHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => `¥${(v as number).toLocaleString()}`} />
                <Line type="monotone" dataKey="sales" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: "#7c3aed" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">注文履歴</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["日付", "商品", "数量", "金額", "ステータス"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderHistory.map((o, i) => (
                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{o.date}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{o.product}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs text-center">{o.qty}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">¥{o.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{o.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 訪問記録 */}
      {activeTab === "訪問記録" && (
        <div className="flex flex-col gap-3">
          {visitHistory.map((v, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="text-xs text-slate-400">{v.date}</span>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{v.purpose}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">次回予定：{v.next}</span>
              </div>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{v.memo}</p>
            </div>
          ))}
        </div>
      )}

      {/* 訪問記録モーダル */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">訪問記録を追加</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">訪問日</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">訪問目的</label>
                <input type="text" placeholder="定期訪問・提案など" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">メモ</label>
                <textarea rows={3} placeholder="商談内容・気づきなど" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">次回訪問予定日</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowVisitModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                キャンセル
              </button>
              <button onClick={() => setShowVisitModal(false)}
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
