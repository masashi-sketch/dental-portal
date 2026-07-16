"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SalesRepAvatar from "@/components/SalesRepAvatar";
import { useToast } from "@/hooks/useToast";
import type { Clinic, ClinicStatus, ClinicTerms, SalesRepWithMaster } from "@/lib/supabase/types";

type ClinicWithStats = Clinic & { month_sales: number; last_order_date: string | null; staff: SalesRepWithMaster | null };

const STATUS_STYLE: Record<ClinicStatus, string> = {
  活性: "bg-emerald-100 text-emerald-700",
  休眠: "bg-amber-100 text-amber-700",
  解約リスク: "bg-red-100 text-red-700",
};

const STATUSES: (ClinicStatus | "すべて")[] = ["すべて", "活性", "休眠", "解約リスク"];

const EMPTY_FORM = { customerCode: "", name: "", area: "", staffId: "", status: "活性" as ClinicStatus };

export default function CustomersPage() {
  const [clinics, setClinics] = useState<ClinicWithStats[]>([]);
  const [terms, setTerms] = useState<ClinicTerms[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepWithMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const [search, setSearch] = useState("");
  const [area, setArea] = useState("すべて");
  const [staff, setStaff] = useState("すべて");
  const [status, setStatus] = useState<ClinicStatus | "すべて">("すべて");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clinicsRes, termsRes, repsRes] = await Promise.all([
        fetch("/api/bgj/clinics"),
        fetch("/api/bgj/clinic-terms"),
        fetch("/api/bgj/sales-reps"),
      ]);
      if (!clinicsRes.ok) throw new Error("得意先一覧の取得に失敗しました");
      const { clinics } = await clinicsRes.json();
      setClinics(clinics);
      if (termsRes.ok) {
        const { terms } = await termsRes.json();
        setTerms(terms ?? []);
      }
      if (repsRes.ok) setSalesReps((await repsRes.json()).salesReps ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const termsMap = new Map(terms.map((t) => [t.customer_code, t]));

  const areas = useMemo(() => ["すべて", ...Array.from(new Set(clinics.map((c) => c.area))).sort()], [clinics]);
  const staffs = useMemo(() => ["すべて", ...salesReps.map((r) => r.name)], [salesReps]);

  const filtered = clinics.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.customer_code.toLowerCase().includes(q) || c.name.includes(q);
    const matchArea = area === "すべて" || c.area === area;
    const matchStaff = staff === "すべて" || c.staff?.name === staff;
    const matchStatus = status === "すべて" || c.status === status;
    return matchSearch && matchArea && matchStaff && matchStatus;
  });

  const openNew = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customerCode.trim() || !form.name.trim() || !form.area.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/bgj/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "登録に失敗しました");
      }
      showToast("得意先を登録しました");
      setShowForm(false);
      await fetchAll();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">得意先一覧</h1>
          <p className="text-sm text-slate-500 mt-0.5">{clinics.length}件登録</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          新規登録
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

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
            {areas.map((a) => <option key={a}>{a}</option>)}
          </select>
          <select value={staff} onChange={(e) => setStaff(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
            {staffs.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as ClinicStatus | "すべて")}
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
                {["得意先コード", "医院名", "エリア", "担当営業", "チェア数", "今月売上", "最終注文日", "コミッション率", "仕切値率", "ステータス", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400">読み込み中...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400">得意先がまだ登録されていません</td></tr>
              )}
              {filtered.map((c) => {
                const t = termsMap.get(c.customer_code);
                return (
                  <tr key={c.customer_code} className="border-b border-slate-50 hover:bg-violet-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-violet-600 font-semibold">{c.customer_code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{c.area}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {c.staff ? (
                        <div className="flex items-center gap-2">
                          <SalesRepAvatar name={c.staff.name} photoUrl={c.staff.photo_url} size={20} className="text-[10px]" />
                          <span>{c.staff.name}</span>
                        </div>
                      ) : (
                        <span className="text-red-400 font-semibold">未割当</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs text-center">{c.chairs}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">
                      {c.month_sales > 0 ? `¥${c.month_sales.toLocaleString()}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{c.last_order_date ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs text-center">
                      {t ? `${t.commission_rate}%` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs text-center">
                      {t ? `${t.wholesale_rate}%` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/bgj/customers/${c.customer_code}`}
                        className="text-xs text-violet-600 hover:text-violet-800 font-semibold whitespace-nowrap">
                        詳細 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          {filtered.length}件表示（全{clinics.length}件）
        </div>
      </div>

      {/* 新規登録モーダル */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">得意先を新規登録</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">得意先コード</label>
                <input type="text" placeholder="例）A000013" value={form.customerCode}
                  onChange={(e) => setForm({ ...form, customerCode: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">医院名</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">エリア</label>
                <input type="text" placeholder="例）東京" value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">担当営業</label>
                <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  <option value="">未割当</option>
                  {salesReps.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}（{r.role?.name || "—"}）</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">ステータス</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClinicStatus })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  <option value="活性">活性</option>
                  <option value="休眠">休眠</option>
                  <option value="解約リスク">解約リスク</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                {saving ? "登録中..." : "登録する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
