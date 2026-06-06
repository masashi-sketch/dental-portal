'use client';

import { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';

type OrderStatus = '確認中' | '配送中' | '完了' | 'キャンセル';

type Order = {
  id: number;
  orderedAt: string;
  patient: string;
  product: string;
  course: '6ヶ月' | '3ヶ月';
  delivery: '自宅' | '医院';
  monthlyPrice: number;
  status: OrderStatus;
  nextDelivery: string;
};

const initialOrders: Order[] = [
  { id: 1, orderedAt: '2026-05-01', patient: '患者 A', product: '定期購入商品 A', course: '6ヶ月', delivery: '自宅', monthlyPrice: 3582, status: '配送中', nextDelivery: '2026-07-01' },
  { id: 2, orderedAt: '2026-05-10', patient: '患者 B', product: '定期購入商品 B', course: '3ヶ月', delivery: '医院', monthlyPrice: 2356, status: '確認中', nextDelivery: '2026-07-05' },
  { id: 3, orderedAt: '2026-05-15', patient: '患者 C', product: '定期購入商品 C', course: '6ヶ月', delivery: '自宅', monthlyPrice: 1782, status: '配送中', nextDelivery: '2026-07-10' },
  { id: 4, orderedAt: '2026-05-20', patient: '患者 A', product: '定期購入商品 D', course: '3ヶ月', delivery: '自宅', monthlyPrice: 2831, status: '完了',   nextDelivery: '—' },
  { id: 5, orderedAt: '2026-06-01', patient: '患者 E', product: '定期購入商品 A', course: '6ヶ月', delivery: '医院', monthlyPrice: 3582, status: '配送中', nextDelivery: '2026-07-20' },
];

const statusColors: Record<OrderStatus, string> = {
  '確認中':    'text-amber-700 bg-amber-50 border-amber-200',
  '配送中':    'text-teal-700  bg-teal-50  border-teal-200',
  '完了':      'text-slate-600 bg-slate-100 border-slate-200',
  'キャンセル': 'text-red-700   bg-red-50   border-red-200',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<OrderStatus | 'すべて'>('すべて');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const updateStatus = (id: number, status: OrderStatus) => {
    setOrders(orders.map((o) => o.id === id ? { ...o, status, nextDelivery: status === '完了' || status === 'キャンセル' ? '—' : o.nextDelivery } : o));
    showToast('ステータスを更新しました');
  };

  const filtered = filter === 'すべて' ? orders : orders.filter((o) => o.status === filter);
  const counts = {
    すべて: orders.length,
    確認中: orders.filter((o) => o.status === '確認中').length,
    配送中: orders.filter((o) => o.status === '配送中').length,
    完了:   orders.filter((o) => o.status === '完了').length,
    キャンセル: orders.filter((o) => o.status === 'キャンセル').length,
  };

  const COMMISSION_RATE = 0.10;
  const activeOrders = orders.filter((o) => o.status === '配送中' || o.status === '確認中');
  const activeCount = activeOrders.length;
  const totalSales = activeOrders.reduce((sum, o) => sum + o.monthlyPrice, 0);
  const commission = Math.floor(totalSales * COMMISSION_RATE);

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="orders" />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-sky-100 px-6 py-4 shadow-sm">
          <h1 className="text-slate-800 font-bold text-xl">定期購入管理</h1>
          <p className="text-slate-600 text-sm mt-0.5">定期購入の注文一覧とステータスを管理します</p>
        </header>

        <main className="flex-1 p-5 sm:p-6 bg-sky-50 flex flex-col gap-5">
          {toast && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
          )}

          {/* フィルタータブ */}
          <div className="flex gap-2 flex-wrap">
            {(['すべて', '確認中', '配送中', '完了', 'キャンセル'] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-3 rounded-xl text-base font-medium transition-colors cursor-pointer ${
                  filter === s ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300'
                }`}>
                {s} <span className="ml-1 text-sm opacity-70">({counts[s]})</span>
              </button>
            ))}
          </div>

          {/* サマリーカード */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm">
              <p className="text-slate-600 text-sm font-medium mb-1">月額売上商品数</p>
              <p className="text-slate-800 text-3xl font-bold">{activeCount}<span className="text-base text-slate-500 font-normal ml-1">件</span></p>
              <p className="text-slate-500 text-xs mt-2">配送中・確認中の注文数</p>
            </div>
            <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm">
              <p className="text-slate-600 text-sm font-medium mb-1">売上金額</p>
              <p className="text-slate-800 text-3xl font-bold">¥{totalSales.toLocaleString()}<span className="text-base text-slate-500 font-normal ml-1">/月</span></p>
              <p className="text-slate-500 text-xs mt-2">アクティブ注文の月額合計</p>
            </div>
            <div className="bg-white border border-teal-100 rounded-2xl p-5 shadow-sm">
              <p className="text-slate-600 text-sm font-medium mb-1">コミッション金額</p>
              <p className="text-teal-700 text-3xl font-bold">¥{commission.toLocaleString()}<span className="text-base text-teal-500 font-normal ml-1">/月</span></p>
              <p className="text-slate-500 text-xs mt-2">売上の10%</p>
            </div>
          </div>

          {/* テーブル */}
          <div className="bg-white border border-sky-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['注文日', '患者名', '商品', 'コース', 'お届け先', '月額', 'コミッション', 'ステータス', '次回配送', '変更'].map((h) => (
                      <th key={h} className="text-left text-slate-600 font-semibold px-4 py-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/80 transition-colors">
                      <td className="px-4 py-4 text-slate-600 whitespace-nowrap text-sm">{o.orderedAt}</td>
                      <td className="px-4 py-4 text-slate-800 font-semibold whitespace-nowrap">{o.patient}</td>
                      <td className="px-4 py-4 text-slate-700 max-w-[180px] truncate">{o.product}</td>
                      <td className="px-4 py-4 text-slate-700 whitespace-nowrap">{o.course}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${o.delivery === '医院' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                          {o.delivery}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-800 whitespace-nowrap font-mono font-semibold">¥{o.monthlyPrice.toLocaleString()}</td>
                      <td className="px-4 py-4 text-teal-700 whitespace-nowrap font-mono font-semibold">
                        ¥{Math.floor(o.monthlyPrice * COMMISSION_RATE).toLocaleString()}<span className="text-teal-500 text-sm font-normal ml-1">/月</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${statusColors[o.status]}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600 whitespace-nowrap text-sm">{o.nextDelivery}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                          className="bg-sky-50 border border-sky-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 cursor-pointer"
                        >
                          <option>確認中</option>
                          <option>配送中</option>
                          <option>完了</option>
                          <option>キャンセル</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="text-center text-slate-500 text-base py-12">該当する注文がありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
