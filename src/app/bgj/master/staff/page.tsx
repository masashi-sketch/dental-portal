"use client";

import { useEffect, useState } from "react";
import SalesRepAvatar from "@/components/SalesRepAvatar";
import { useToast } from "@/hooks/useToast";
import type { SalesRepWithMaster, StaffArea, StaffRole } from "@/lib/supabase/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type ClinicSummary = { staff: { id: string } | null; month_sales: number };

const EMPTY_FORM = { name: "", roleId: "", areaId: "", phone: "", email: "", photoUrl: "" };

export default function StaffMasterPage() {
  const [salesReps, setSalesReps] = useState<SalesRepWithMaster[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [areas, setAreas] = useState<StaffArea[]>([]);
  const [clinics, setClinics] = useState<ClinicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<SalesRepWithMaster | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAll = () => {
    Promise.all([
      fetch("/api/bgj/sales-reps"),
      fetch("/api/bgj/staff-roles"),
      fetch("/api/bgj/staff-areas"),
      fetch("/api/bgj/clinics"),
    ])
      .then(([repsRes, rolesRes, areasRes, clinicsRes]) => {
        if (!repsRes.ok) throw new Error("営業担当者一覧の取得に失敗しました");
        return Promise.all([
          repsRes.json(),
          rolesRes.ok ? rolesRes.json() : Promise.resolve(null),
          areasRes.ok ? areasRes.json() : Promise.resolve(null),
          clinicsRes.ok ? clinicsRes.json() : Promise.resolve(null),
        ]);
      })
      .then(([repsData, rolesData, areasData, clinicsData]) => {
        setSalesReps(repsData.salesReps ?? []);
        if (rolesData) setRoles(rolesData.staffRoles ?? []);
        if (areasData) setAreas(areasData.staffAreas ?? []);
        if (clinicsData) setClinics(clinicsData.clinics ?? []);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const statsFor = (repId: string) => {
    const assigned = clinics.filter((c) => c.staff?.id === repId);
    const monthSales = assigned.reduce((sum, c) => sum + (c.month_sales ?? 0), 0);
    return { customers: assigned.length, monthSales };
  };

  const openNew = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (rep: SalesRepWithMaster) => {
    setEditItem(rep);
    setForm({
      name: rep.name,
      roleId: rep.role_id ?? "",
      areaId: rep.area_id ?? "",
      phone: rep.phone ?? "",
      email: rep.email ?? "",
      photoUrl: rep.photo_url ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(editItem ? `/api/bgj/sales-reps/${editItem.id}` : "/api/bgj/sales-reps", {
        method: editItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "保存に失敗しました");
      }
      showToast(editItem ? "営業担当者を更新しました" : "営業担当者を登録しました");
      setShowModal(false);
      fetchAll();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/bgj/sales-reps/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "削除に失敗しました");
      }
      setDeleteId(null);
      showToast("営業担当者を削除しました");
      fetchAll();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">営業担当</h1>
          <p className="text-sm text-slate-500 mt-0.5">営業担当者の管理</p>
        </div>
        <Button theme="violet" size="sm" className="shadow-sm" onClick={openNew}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          担当者を追加
        </Button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* 担当者カード */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {loading && <LoadingState variant="grid-cell" />}
        {!loading && salesReps.length === 0 && (
          <p className="text-slate-400 col-span-full text-center py-8">営業担当者がまだ登録されていません</p>
        )}
        {salesReps.map((s) => {
          const stats = statsFor(s.id);
          return (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <SalesRepAvatar name={s.name} photoUrl={s.photo_url} size={44} className="text-lg" />
                  <div>
                    <p className="font-bold text-slate-800">{s.name}</p>
                    <p className="text-xs text-violet-600 font-semibold">{s.role?.name || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">編集</button>
                  <button onClick={() => setDeleteId(s.id)} className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">削除</button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {s.area?.name || "—"}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {s.phone || "—"}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {s.email || "—"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-violet-600">{stats.customers}</p>
                  <p className="text-xs text-slate-400">得意先</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">¥{stats.monthSales.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">今月売上</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 担当変更テーブル */}
      <Card className="overflow-hidden">
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
              { date: "2026-05-01", code: "A000009", name: "ひまわり歯科", from: "山本権兵衛", to: "（未割当）", reason: "エリア移管" },
              { date: "2026-04-10", code: "A000011", name: "天神歯科医院", from: "田中花子", to: "佐藤次郎", reason: "エリア担当変更" },
              { date: "2026-03-01", code: "A000006", name: "港南デンタル", from: "佐藤次郎", to: "山本権兵衛", reason: "担当引継ぎ" },
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
      </Card>

      {/* 追加・編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editItem ? "担当者を編集" : "担当者を追加"}</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">氏名</label>
                <input type="text" placeholder="山田太郎" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">役職</label>
                <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  <option value="">未設定</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">担当エリア</label>
                <select value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  <option value="">未設定</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">電話番号</label>
                <input type="text" placeholder="090-0000-0000" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">メールアドレス</label>
                <input type="text" placeholder="yamada@biogaia.jp" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">顔写真の画像URL</label>
                <input type="text" placeholder="https://..." value={form.photoUrl}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                キャンセル
              </button>
              <Button theme="violet" size="sm" fullWidth onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : editItem ? "更新する" : "追加"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認 */}
      <ConfirmDialog
        open={deleteId !== null}
        theme="violet"
        title="削除しますか？"
        description="この操作は取り消せません。担当していた得意先は未割当になります。"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  );
}
