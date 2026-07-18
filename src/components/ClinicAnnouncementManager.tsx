'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import type { ClinicAnnouncement } from '@/lib/supabase/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const TAG_OPTIONS: ClinicAnnouncement['tag'][] = ['重要', 'お知らせ', 'キャンペーン'];

const TAG_COLORS: Record<ClinicAnnouncement['tag'], string> = {
  重要: 'text-red-700 bg-red-50 border-red-200',
  お知らせ: 'text-blue-700 bg-blue-50 border-blue-200',
  キャンペーン: 'text-amber-700 bg-amber-50 border-amber-200',
};

const EMPTY_FORM = { announcementDate: '', tag: 'お知らせ' as ClinicAnnouncement['tag'], text: '', status: '公開' as ClinicAnnouncement['status'] };

// 医院用ポータル（/admin/news）・BGJポータル（/bgj/customers/[code]、代理編集）の
// 両方から使う、患者ポータルのホーム画面に表示するお知らせの管理コンポーネント。
// customerCodeを渡すとBGJの代理編集モード（各リクエストにcustomerCodeを付与）になる。
export default function ClinicAnnouncementManager({
  customerCode,
  theme = 'sky',
}: {
  customerCode?: string;
  theme?: 'sky' | 'violet';
}) {
  const [announcements, setAnnouncements] = useState<ClinicAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ClinicAnnouncement | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const qs = customerCode ? `?customerCode=${encodeURIComponent(customerCode)}` : '';

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clinic-announcements${qs}`);
      if (res.ok) setAnnouncements((await res.json()).announcements ?? []);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openNew = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, announcementDate: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };

  const openEdit = (a: ClinicAnnouncement) => {
    setEditItem(a);
    setForm({
      announcementDate: a.announcement_date,
      tag: a.tag,
      text: a.text,
      status: a.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(editItem ? `/api/admin/clinic-announcements/${editItem.id}` : '/api/admin/clinic-announcements', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerCode ? { ...form, customerCode } : form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '保存に失敗しました');
      }
      const { announcement } = await res.json();
      setAnnouncements((prev) =>
        editItem
          ? prev.map((a) => (a.id === announcement.id ? announcement : a))
          : [announcement, ...prev].sort((a, b) => (a.announcement_date < b.announcement_date ? 1 : -1)),
      );
      showToast(editItem ? 'お知らせを更新しました' : 'お知らせを追加しました');
      setShowModal(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/clinic-announcements/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '削除に失敗しました');
      }
      setDeleteId(null);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast('お知らせを削除しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    }
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-slate-700">お知らせ</p>
        <Button theme={theme} size="sm" onClick={openNew}>
          ＋ 追加
        </Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <Card theme={theme} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['日付', 'タグ', '内容', 'ステータス', '操作'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {announcements.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">お知らせがまだ登録されていません</td></tr>
                )}
                {announcements.map((a) => (
                  <tr key={a.id} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{a.announcement_date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TAG_COLORS[a.tag]}`}>{a.tag}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{a.text}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        a.status === '公開' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(a)} className="text-xs text-blue-700 hover:text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-semibold">編集</button>
                        <button onClick={() => setDeleteId(a.id)} className="text-xs text-red-600 hover:text-red-500 bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-semibold">削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editItem ? 'お知らせを編集' : 'お知らせを追加'}</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">日付</label>
                <input type="date" value={form.announcementDate}
                  onChange={(e) => setForm({ ...form, announcementDate: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">タグ</label>
                <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value as ClinicAnnouncement['tag'] })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  {TAG_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">内容</label>
                <textarea rows={4} placeholder="お知らせの内容を入力" value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">ステータス</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClinicAnnouncement['status'] })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  <option value="公開">公開</option>
                  <option value="下書き">下書き</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                キャンセル
              </button>
              <Button theme={theme} size="sm" fullWidth onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : editItem ? '更新する' : '追加する'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        theme={theme}
        title="削除しますか？"
        description="この操作は取り消せません。患者様ポータルからも表示が消えます。"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  );
}
