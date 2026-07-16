'use client';

import { useEffect, useState } from 'react';
import SalesRepAvatar from '@/components/SalesRepAvatar';
import { useToast } from '@/hooks/useToast';
import type { ClinicStaff } from '@/lib/supabase/types';

const EMPTY_FORM = { roleLabel: '', name: '', credentials: '', description: '', photoUrl: '' };

const THEMES = {
  sky: {
    button: 'bg-sky-500 hover:bg-sky-400',
    ring: 'focus:ring-sky-400',
    toast: 'bg-sky-600',
    link: 'text-sky-600 hover:text-sky-800 hover:bg-sky-50',
  },
  violet: {
    button: 'bg-violet-600 hover:bg-violet-700',
    ring: 'focus:ring-violet-400',
    toast: 'bg-violet-600',
    link: 'text-violet-600 hover:text-violet-800 hover:bg-violet-50',
  },
} as const;

// 医院用ポータル（/admin/clinic-intro）・BGJポータル（/bgj/customers/[code]、代理編集）の
// 両方から使う、クリニック紹介のスタッフ紹介の追加・編集・削除・並び替えコンポーネント。
// customerCodeを渡すとBGJの代理編集モード（各リクエストにcustomerCodeを付与）になる。
export default function ClinicStaffManager({
  customerCode,
  theme = 'sky',
}: {
  customerCode?: string;
  theme?: 'sky' | 'violet';
}) {
  const t = THEMES[theme];
  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ClinicStaff | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const qs = customerCode ? `?customerCode=${encodeURIComponent(customerCode)}` : '';

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clinic-staff${qs}`);
      if (res.ok) setStaff((await res.json()).staff ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [customerCode]);

  const openNew = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (s: ClinicStaff) => {
    setEditItem(s);
    setForm({
      roleLabel: s.role_label,
      name: s.name,
      credentials: s.credentials ?? '',
      description: s.description ?? '',
      photoUrl: s.photo_url ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.roleLabel.trim() || !form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(editItem ? `/api/admin/clinic-staff/${editItem.id}` : '/api/admin/clinic-staff', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerCode ? { ...form, customerCode } : form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '保存に失敗しました');
      }
      const { staff: savedStaff } = await res.json();
      setStaff((prev) => (editItem ? prev.map((s) => (s.id === savedStaff.id ? savedStaff : s)) : [...prev, savedStaff]));
      showToast(editItem ? 'スタッフ情報を更新しました' : 'スタッフを追加しました');
      setShowModal(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/clinic-staff/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '削除に失敗しました');
      }
      setDeleteId(null);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      showToast('スタッフを削除しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    }
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = staff[index + direction];
    const current = staff[index];
    if (!target || !current) return;
    const nextStaff = [...staff];
    nextStaff[index] = { ...target, sort_order: current.sort_order };
    nextStaff[index + direction] = { ...current, sort_order: target.sort_order };
    setStaff(nextStaff);
    void Promise.all([
      fetch(`/api/admin/clinic-staff/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: target.sort_order }),
      }),
      fetch(`/api/admin/clinic-staff/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: current.sort_order }),
      }),
    ]);
  };

  return (
    <div>
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 ${t.toast} text-white text-base px-5 py-3 rounded-2xl shadow-xl`}>{toast}</div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-slate-700">スタッフ紹介</p>
        <button
          onClick={openNew}
          className={`flex items-center gap-2 ${t.button} text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors`}
        >
          ＋ スタッフを追加
        </button>
      </div>

      {loading && <p className="text-slate-400 text-sm">読み込み中...</p>}
      {!loading && staff.length === 0 && <p className="text-slate-400 text-sm">まだスタッフが登録されていません</p>}

      <div className="flex flex-col gap-3">
        {staff.map((s, i) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <SalesRepAvatar name={s.name} photoUrl={s.photo_url} size={40} className="text-sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{s.role_label}</span>
                <p className="font-bold text-slate-800 truncate">{s.name}</p>
              </div>
              {s.credentials && <p className="text-xs text-slate-500 mt-1 break-all">{s.credentials}</p>}
              {s.description && <p className="text-xs text-slate-400 mt-1 break-all">{s.description}</p>}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1">
                <button onClick={() => handleMove(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1">↑</button>
                <button onClick={() => handleMove(i, 1)} disabled={i === staff.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1">↓</button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(s)} className={`text-xs px-2 py-1 rounded-lg transition-colors ${t.link}`}>編集</button>
                <button onClick={() => setDeleteId(s.id)} className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">削除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editItem ? 'スタッフ情報を編集' : 'スタッフを追加'}</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">役職(タブ名)</label>
                <input type="text" placeholder="例）院長" value={form.roleLabel}
                  onChange={(e) => setForm({ ...form, roleLabel: e.target.value })}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring}`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">氏名</label>
                <input type="text" placeholder="例）山田太郎" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring}`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">資格・経歴</label>
                <input type="text" placeholder="例）日本歯科大学卒" value={form.credentials}
                  onChange={(e) => setForm({ ...form, credentials: e.target.value })}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring}`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">紹介文</label>
                <textarea rows={3} placeholder="患者様へのメッセージなど" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring} resize-none`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">顔写真の画像URL</label>
                <input type="text" placeholder="https://..." value={form.photoUrl}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring}`} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving}
                className={`flex-1 py-3 rounded-xl ${t.button} disabled:opacity-50 text-white text-sm font-semibold transition-colors`}>
                {saving ? '保存中...' : editItem ? '更新する' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <p className="text-slate-800 font-bold text-lg mb-2">削除しますか？</p>
            <p className="text-slate-600 text-sm mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                キャンセル
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors">
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
