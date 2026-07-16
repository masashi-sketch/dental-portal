'use client';

import { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { useToast } from '@/hooks/useToast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type NewsItem = {
  id: number;
  date: string;
  tag: '重要' | 'お知らせ' | 'キャンペーン';
  text: string;
  status: '公開' | '下書き';
};

const initialNews: NewsItem[] = [
  { id: 1, date: '2026-06-01', tag: '重要',    text: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯', status: '公開' },
  { id: 2, date: '2026-05-20', tag: 'お知らせ', text: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯', status: '公開' },
  { id: 3, date: '2026-05-10', tag: 'お知らせ', text: '◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯◯', status: '公開' },
];

const tagColors: Record<string, string> = {
  '重要':       'text-red-700 bg-red-50 border-red-200',
  'お知らせ':   'text-blue-700 bg-blue-50 border-blue-200',
  'キャンペーン': 'text-amber-700 bg-amber-50 border-amber-200',
};

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<NewsItem | null>(null);
  const [form, setForm] = useState({ date: '', tag: 'お知らせ' as NewsItem['tag'], text: '', status: '公開' as NewsItem['status'] });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast, showToast } = useToast();

  const openNew = () => {
    setEditItem(null);
    setForm({ date: new Date().toISOString().slice(0, 10), tag: 'お知らせ', text: '', status: '公開' });
    setShowForm(true);
  };

  const openEdit = (item: NewsItem) => {
    setEditItem(item);
    setForm({ date: item.date, tag: item.tag, text: item.text, status: item.status });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.text.trim()) return;
    if (editItem) {
      setNews(news.map((n) => n.id === editItem.id ? { ...editItem, ...form } : n));
      showToast('お知らせを更新しました');
    } else {
      setNews([{ id: Date.now(), ...form }, ...news]);
      showToast('お知らせを追加しました');
    }
    setShowForm(false);
  };

  const handleDelete = (id: number) => {
    setNews(news.filter((n) => n.id !== id));
    setDeleteId(null);
    showToast('お知らせを削除しました');
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="news" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        {/* トップバー */}
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 shadow-sm">
          <div>
            <h1 className="text-slate-800 font-bold text-xl">お知らせ管理</h1>
            <p className="text-slate-600 text-sm mt-0.5">患者ポータルに表示するお知らせを管理します</p>
          </div>
          <Button theme="sky" onClick={openNew}>
            ＋ 追加
          </Button>
        </header>

        <main className="flex-1 p-5 sm:p-6 bg-sky-50">
          {toast && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">
              {toast}
            </div>
          )}

          <Card theme="sky" className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-slate-600 font-semibold px-5 py-4 whitespace-nowrap">日付</th>
                    <th className="text-left text-slate-600 font-semibold px-5 py-4 whitespace-nowrap">タグ</th>
                    <th className="text-left text-slate-600 font-semibold px-5 py-4">内容</th>
                    <th className="text-left text-slate-600 font-semibold px-5 py-4 whitespace-nowrap">ステータス</th>
                    <th className="text-left text-slate-600 font-semibold px-5 py-4 whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {news.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/80 transition-colors">
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{item.date}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${tagColors[item.tag]}`}>
                          {item.tag}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700 max-w-xs truncate">{item.text}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                          item.status === '公開' ? 'text-teal-700 bg-teal-50' : 'text-slate-600 bg-slate-100'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-sm text-blue-700 hover:text-blue-600 bg-blue-50 px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="text-sm text-red-600 hover:text-red-500 bg-red-50 px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {news.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-slate-500 text-base py-12">お知らせがありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

      {/* 追加・編集モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card theme="sky" className="p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-slate-800 font-bold text-xl mb-5">{editItem ? 'お知らせを編集' : 'お知らせを追加'}</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">日付</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
              </div>
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">タグ</label>
                <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value as NewsItem['tag'] })}
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40">
                  <option>重要</option>
                  <option>お知らせ</option>
                  <option>キャンペーン</option>
                </select>
              </div>
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">内容</label>
                <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={3}
                  placeholder="お知らせの内容を入力"
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none placeholder-slate-400" />
              </div>
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">ステータス</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as NewsItem['status'] })}
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40">
                  <option>公開</option>
                  <option>下書き</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-base font-medium transition-colors cursor-pointer">
                キャンセル
              </button>
              <Button theme="sky" fullWidth onClick={handleSave}>
                {editItem ? '更新する' : '追加する'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 削除確認モーダル */}
      <ConfirmDialog
        open={deleteId !== null}
        theme="sky"
        title="削除しますか？"
        description="この操作は取り消せません。"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  );
}
