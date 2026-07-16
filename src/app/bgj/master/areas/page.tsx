"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import type { StaffArea } from "@/lib/supabase/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function StaffAreasMasterPage() {
  const [areas, setAreas] = useState<StaffArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<StaffArea | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAreas = () => {
    fetch("/api/bgj/staff-areas")
      .then((res) => {
        if (!res.ok) throw new Error("担当エリアマスタの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setAreas(data.staffAreas ?? []);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAreas(); }, []);

  const openNew = () => {
    setEditItem(null);
    setName("");
    setShowModal(true);
  };

  const openEdit = (area: StaffArea) => {
    setEditItem(area);
    setName(area.name);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(editItem ? `/api/bgj/staff-areas/${editItem.id}` : "/api/bgj/staff-areas", {
        method: editItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "保存に失敗しました");
      }
      showToast(editItem ? "担当エリアを更新しました" : "担当エリアを追加しました");
      setShowModal(false);
      fetchAreas();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/bgj/staff-areas/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "削除に失敗しました");
      }
      setDeleteId(null);
      showToast("担当エリアを削除しました");
      fetchAreas();
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
          <h1 className="text-xl font-bold text-slate-800">担当エリアマスタ</h1>
          <p className="text-sm text-slate-500 mt-0.5">営業担当者の担当エリアを管理します</p>
        </div>
        <Button theme="violet" size="sm" className="shadow-sm" onClick={openNew}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          エリアを追加
        </Button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">エリア名</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingState variant="table-row" colSpan={2} />}
            {!loading && areas.length === 0 && (
              <tr><td colSpan={2} className="px-5 py-8 text-center text-slate-400">エリアがまだ登録されていません</td></tr>
            )}
            {areas.map((a) => (
              <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3 text-slate-800 font-semibold">{a.name}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">編集</button>
                    <button onClick={() => setDeleteId(a.id)} className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">削除</button>
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
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editItem ? "エリアを編集" : "エリアを追加"}</h2>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">エリア名</label>
              <input type="text" placeholder="例）東京・関東" value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
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
        description="このエリアを使っている担当者は「未設定」になります。"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  );
}
