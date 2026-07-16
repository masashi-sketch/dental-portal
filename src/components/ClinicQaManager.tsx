'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import type { ClinicQa } from '@/lib/supabase/types';

const EMPTY_FORM = { category: '', question: '', answer: '', status: '公開' as ClinicQa['status'] };

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

// 医院用ポータル（/admin/qa）・BGJポータル（/bgj/customers/[code]、代理編集）の
// 両方から使う、Q&Aの追加・編集・削除・並び替えコンポーネント。
// customerCodeを渡すとBGJの代理編集モード（各リクエストにcustomerCodeを付与）になる。
export default function ClinicQaManager({
  customerCode,
  theme = 'sky',
}: {
  customerCode?: string;
  theme?: 'sky' | 'violet';
}) {
  const t = THEMES[theme];
  const [qaList, setQaList] = useState<ClinicQa[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ClinicQa | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const qs = customerCode ? `?customerCode=${encodeURIComponent(customerCode)}` : '';

  const fetchAll = async () => {
    try {
      const res = await fetch(`/api/admin/clinic-qa${qs}`);
      if (res.ok) setQaList((await res.json()).qa ?? []);
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

  const openEdit = (item: ClinicQa) => {
    setEditItem(item);
    setForm({ category: item.category, question: item.question, answer: item.answer, status: item.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.category.trim() || !form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(editItem ? `/api/admin/clinic-qa/${editItem.id}` : '/api/admin/clinic-qa', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerCode ? { ...form, customerCode } : form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '保存に失敗しました');
      }
      const { qa } = await res.json();
      setQaList((prev) => (editItem ? prev.map((item) => (item.id === qa.id ? qa : item)) : [...prev, qa]));
      showToast(editItem ? 'Q&Aを更新しました' : 'Q&Aを追加しました');
      setShowModal(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/clinic-qa/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '削除に失敗しました');
      }
      setDeleteId(null);
      setQaList((prev) => prev.filter((item) => item.id !== id));
      showToast('Q&Aを削除しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    }
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = qaList[index + direction];
    const current = qaList[index];
    if (!target || !current) return;
    const nextList = [...qaList];
    nextList[index] = { ...target, sort_order: current.sort_order };
    nextList[index + direction] = { ...current, sort_order: target.sort_order };
    setQaList(nextList);
    void Promise.all([
      fetch(`/api/admin/clinic-qa/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: target.sort_order }),
      }),
      fetch(`/api/admin/clinic-qa/${target.id}`, {
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
        <p className="text-sm font-bold text-slate-700">Q&amp;A</p>
        <button
          onClick={openNew}
          className={`flex items-center gap-2 ${t.button} text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors`}
        >
          ＋ Q&amp;Aを追加
        </button>
      </div>

      {loading && <p className="text-slate-400 text-sm">読み込み中...</p>}
      {!loading && qaList.length === 0 && <p className="text-slate-400 text-sm">まだQ&amp;Aが登録されていません</p>}

      <div className="flex flex-col gap-3">
        {qaList.map((item, i) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{item.category}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === '公開' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 break-all">Q. {item.question}</p>
                <p className="text-xs text-slate-500 mt-1 break-all">A. {item.answer}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1">
                  <button onClick={() => handleMove(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1">↑</button>
                  <button onClick={() => handleMove(i, 1)} disabled={i === qaList.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1">↓</button>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(item)} className={`text-xs px-2 py-1 rounded-lg transition-colors ${t.link}`}>編集</button>
                  <button onClick={() => setDeleteId(item.id)} className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">削除</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editItem ? 'Q&amp;Aを編集' : 'Q&amp;Aを追加'}</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">カテゴリ</label>
                <input type="text" placeholder="例）予約・診療" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring}`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">質問</label>
                <textarea rows={2} value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring} resize-none`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">回答</label>
                <textarea rows={4} value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring} resize-none`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">ステータス</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClinicQa['status'] })}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring} bg-white`}>
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
