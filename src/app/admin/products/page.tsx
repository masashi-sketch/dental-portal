'use client';

import { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';

type ProductCategory = '定期購入' | 'おすすめ商品';

type Product = {
  id: number;
  name: string;
  category: ProductCategory;
  subCategory: string;
  price: number;
  unit: string;
  status: '公開' | '非公開';
};

const initialProducts: Product[] = [
  { id: 1, name: 'オーラルプロバイオティクス',    category: '定期購入',   subCategory: 'サプリメント', price: 3980, unit: '月',   status: '公開' },
  { id: 2, name: 'カルシウム＋ビタミンD',          category: '定期購入',   subCategory: 'サプリメント', price: 2480, unit: '月',   status: '公開' },
  { id: 3, name: '歯科専用 乳酸菌タブレット',      category: '定期購入',   subCategory: 'サプリメント', price: 1980, unit: '月',   status: '公開' },
  { id: 4, name: 'マルチビタミン＆ミネラル',        category: '定期購入',   subCategory: 'サプリメント', price: 2980, unit: '月',   status: '公開' },
  { id: 5, name: 'L.ロイテリ プロバイオティクス',  category: 'おすすめ商品', subCategory: 'サプリメント', price: 3980, unit: '本',   status: '公開' },
  { id: 6, name: 'L.ロイテリ ヨーグルト 4本セット', category: 'おすすめ商品', subCategory: 'ヨーグルト',  price: 1580, unit: 'セット', status: '公開' },
  { id: 7, name: '電動歯ブラシ スタンダード',      category: 'おすすめ商品', subCategory: '歯ブラシ',    price: 4980, unit: 'セット', status: '公開' },
  { id: 8, name: '薬用洗口液 500ml',                category: 'おすすめ商品', subCategory: 'オーラルケア', price: 1280, unit: '個',   status: '非公開' },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', category: '定期購入' as ProductCategory, subCategory: '', price: '', unit: '', status: '公開' as Product['status'] });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState<ProductCategory | 'すべて'>('すべて');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const openNew = () => {
    setEditItem(null);
    setForm({ name: '', category: '定期購入', subCategory: '', price: '', unit: '月', status: '公開' });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditItem(p);
    setForm({ name: p.name, category: p.category, subCategory: p.subCategory, price: String(p.price), unit: p.unit, status: p.status });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.price) return;
    if (editItem) {
      setProducts(products.map((p) => p.id === editItem.id ? { ...p, ...form, price: Number(form.price) } : p));
      showToast('商品情報を更新しました');
    } else {
      setProducts([{ id: Date.now(), ...form, price: Number(form.price) }, ...products]);
      showToast('商品を追加しました');
    }
    setShowForm(false);
  };

  const handleDelete = (id: number) => {
    setProducts(products.filter((p) => p.id !== id));
    setDeleteId(null);
    showToast('商品を削除しました');
  };

  const toggleStatus = (id: number) => {
    setProducts(products.map((p) => p.id === id ? { ...p, status: p.status === '公開' ? '非公開' : '公開' } : p));
  };

  const filtered = filterCat === 'すべて' ? products : products.filter((p) => p.category === filterCat);

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="products" />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-sky-100 px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-slate-800 font-bold text-lg">商品管理</h1>
            <p className="text-slate-500 text-xs mt-0.5">定期購入・おすすめ商品を管理します</p>
          </div>
          <button onClick={openNew}
            className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer">
            ＋ 商品を追加
          </button>
        </header>

        <main className="flex-1 p-5 sm:p-6 bg-sky-50 flex flex-col gap-5">
          {toast && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-sm px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
          )}

          {/* フィルタータブ */}
          <div className="flex gap-2">
            {(['すべて', '定期購入', 'おすすめ商品'] as const).map((c) => (
              <button key={c} onClick={() => setFilterCat(c)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  filterCat === c ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-sky-300'
                }`}>
                {c} ({c === 'すべて' ? products.length : products.filter((p) => p.category === c).length})
              </button>
            ))}
          </div>

          {/* テーブル */}
          <div className="bg-white border border-sky-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['商品名', 'カテゴリ', 'サブカテゴリ', '価格', 'ステータス', '操作'].map((h) => (
                      <th key={h} className="text-left text-slate-500 font-medium px-5 py-3.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/80 transition-colors">
                      <td className="px-5 py-4 text-slate-800 font-semibold">{p.name}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          p.category === '定期購入' ? 'text-indigo-600 bg-indigo-50' : 'text-amber-600 bg-amber-50'
                        }`}>{p.category}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">{p.subCategory}</td>
                      <td className="px-5 py-4 text-slate-700 whitespace-nowrap font-mono">
                        ¥{p.price.toLocaleString()}<span className="text-slate-400 text-xs ml-1">/{p.unit}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <button onClick={() => toggleStatus(p.id)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-opacity hover:opacity-70 ${
                            p.status === '公開' ? 'text-teal-600 bg-teal-50' : 'text-slate-500 bg-slate-100'
                          }`}>
                          {p.status}
                        </button>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(p)}
                            className="text-xs text-blue-600 hover:text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                            編集
                          </button>
                          <button onClick={() => setDeleteId(p.id)}
                            className="text-xs text-red-500 hover:text-red-400 bg-red-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* 追加・編集モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-sky-100 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-slate-800 font-bold text-lg mb-5">{editItem ? '商品を編集' : '商品を追加'}</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-slate-600 text-sm mb-1.5 block">商品名</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例）オーラルプロバイオティクス"
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 text-sm mb-1.5 block">カテゴリ</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
                    className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40">
                    <option>定期購入</option>
                    <option>おすすめ商品</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 text-sm mb-1.5 block">サブカテゴリ</label>
                  <input type="text" value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                    placeholder="例）サプリメント"
                    className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 text-sm mb-1.5 block">価格（税込）</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="3980"
                    className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400" />
                </div>
                <div>
                  <label className="text-slate-600 text-sm mb-1.5 block">単位</label>
                  <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="月 / 本 / 個"
                    className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400" />
                </div>
              </div>
              <div>
                <label className="text-slate-600 text-sm mb-1.5 block">ステータス</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Product['status'] })}
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40">
                  <option>公開</option>
                  <option>非公開</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm transition-colors cursor-pointer">
                キャンセル
              </button>
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm transition-colors cursor-pointer">
                {editItem ? '更新する' : '追加する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-sky-100 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <p className="text-slate-800 font-bold text-base mb-2">削除しますか？</p>
            <p className="text-slate-500 text-sm mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm transition-colors cursor-pointer">
                キャンセル
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition-colors cursor-pointer">
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
