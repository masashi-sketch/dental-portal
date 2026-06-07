"use client";

import { useState } from "react";

const STAFF = [
  {
    name: "山本権兵衛", role: "歯科衛生士", area: "大阪・近畿", customers: 82,
    monthSales: 2180, visits: 24, phone: "090-xxxx-xxxx",
    email: "yamamoto@biogaia.jp",
  },
  {
    name: "田中花子", role: "歯科衛生士", area: "東京・関東", customers: 91,
    monthSales: 1890, visits: 31, phone: "080-xxxx-xxxx",
    email: "tanaka@biogaia.jp",
  },
  {
    name: "佐藤次郎", role: "営業担当", area: "北海道・九州", customers: 75,
    monthSales: 2050, visits: 28, phone: "070-xxxx-xxxx",
    email: "sato@biogaia.jp",
  },
];

export default function StaffPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">担当・設定</h1>
          <p className="text-sm text-slate-500 mt-0.5">営業担当者の管理</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          担当者を追加
        </button>
      </div>

      {/* 担当者カード */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {STAFF.map((s) => (
          <div key={s.name} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-gradient-to-br from-violet-400 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
                {s.name[0]}
              </div>
              <div>
                <p className="font-bold text-slate-800">{s.name}</p>
                <p className="text-xs text-violet-600 font-semibold">{s.role}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {s.area}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {s.phone}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {s.email}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
              <div className="text-center">
                <p className="text-lg font-bold text-violet-600">{s.customers}</p>
                <p className="text-xs text-slate-400">得意先</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-600">¥{s.monthSales}k</p>
                <p className="text-xs text-slate-400">今月売上</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-sky-600">{s.visits}</p>
                <p className="text-xs text-slate-400">今月訪問</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 担当変更テーブル */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">担当変更履歴</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["変更日", "得意先コード", "医院名", "変更前", "変更後", "変更理由"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { date: "2026-05-01", code: "SB-0203", name: "ひまわり歯科", from: "山本権兵衛", to: "（未割当）", reason: "エリア移管" },
              { date: "2026-04-10", code: "FK-0029", name: "天神歯科医院", from: "田中花子", to: "佐藤次郎", reason: "エリア担当変更" },
              { date: "2026-03-01", code: "OS-0072", name: "港南デンタル", from: "佐藤次郎", to: "山本権兵衛", reason: "担当引継ぎ" },
            ].map((r, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-3 text-slate-400 text-xs">{r.date}</td>
                <td className="px-5 py-3 font-mono text-xs text-violet-600">{r.code}</td>
                <td className="px-5 py-3 text-slate-700 font-semibold">{r.name}</td>
                <td className="px-5 py-3 text-slate-500 text-xs">{r.from}</td>
                <td className="px-5 py-3 text-slate-700 text-xs font-semibold">{r.to}</td>
                <td className="px-5 py-3 text-slate-400 text-xs">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 追加モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">担当者を追加</h2>
            <div className="flex flex-col gap-3">
              {[
                { label: "氏名", placeholder: "山田太郎" },
                { label: "役職", placeholder: "歯科衛生士・営業担当など" },
                { label: "担当エリア", placeholder: "東京・関東" },
                { label: "電話番号", placeholder: "090-0000-0000" },
                { label: "メールアドレス", placeholder: "yamada@biogaia.jp" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">{f.label}</label>
                  <input type="text" placeholder={f.placeholder}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                キャンセル
              </button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
