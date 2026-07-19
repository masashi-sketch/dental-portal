"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import type { ClinicStatusColor, ClinicStatusMaster } from "@/lib/supabase/types";
import { CLINIC_STATUS_BADGE_CLASS, CLINIC_STATUS_COLOR_OPTIONS } from "@/lib/clinicStatusColors";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const EMPTY_FORM: { name: string; color: ClinicStatusColor } = { name: "", color: "slate" };

export default function ClinicStatusesMasterPage() {
  const [statuses, setStatuses] = useState<ClinicStatusMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ClinicStatusMaster | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchStatuses = () => {
    fetch("/api/bgj/clinic-statuses")
      .then((res) => {
        if (!res.ok) throw new Error("ステータスマスタの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setStatuses(data.clinicStatuses ?? []);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStatuses(); }, []);

  const openNew = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (status: ClinicStatusMaster) => {
    setEditItem(status);
    setForm({ name: status.name, color: status.color });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(editItem ? `/api/bgj/clinic-statuses/${editItem.id}` : "/api/bgj/clinic-statuses", {
        method: editItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "保存に失敗しました");
      }
      showToast(editItem ? "ステータスを更新しました" : "ステータスを追加しました");
      setShowModal(false);
      fetchStatuses();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/bgj/clinic-statuses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "削除に失敗しました");
      }
      setDeleteId(null);
      showToast("ステータスを削除しました");
      fetchStatuses();
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
          <h1 className="text-xl font-bold text-slate-800">ステータスマスタ</h1>
          <p className="text-sm text-slate-500 mt-0.5">得意先一覧・基本情報タブで使う「ステータス」を管理します</p>
        </div>
        <Button theme="violet" size="sm" className="shadow-sm" onClick={openNew}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          ステータスを追加
        </Button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">ステータス名</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingState variant="table-row" colSpan={2} />}
            {!loading && statuses.length === 0 && (
              <tr><td colSpan={2} className="px-5 py-8 text-center text-slate-400">ステータスがまだ登録されていません</td></tr>
            )}
            {statuses.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${CLINIC_STATUS_BADGE_CLASS[s.color]}`}>
                    {s.name}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">編集</button>
                    <button onClick={() => setDeleteId(s.id)} className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">削除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editItem ? "ステータスを編集" : "ステータスを追加"}</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">ステータス名</label>
                <input type="text" placeholder="例）休止中" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">バッジの色</label>
                <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value as ClinicStatusColor })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  {CLINIC_STATUS_COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <div className="mt-2">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${CLINIC_STATUS_BADGE_CLASS[form.color]}`}>
                    {form.name || "プレビュー"}
                  </span>
                </div>
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

      <ConfirmDialog
        open={deleteId !== null}
        theme="violet"
        title="削除しますか？"
        description="このステータスを使っている得意先は「未設定」になります。"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  );
}
