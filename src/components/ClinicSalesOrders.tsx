'use client';

import { useEffect, useMemo, useState } from 'react';
import nextDynamic from 'next/dynamic';
import Card from '@/components/ui/Card';
import type { ClinicOrder } from '@/lib/supabase/types';

const SalesHistoryChart = nextDynamic(() => import('@/components/SalesHistoryChart'), {
  ssr: false,
  loading: () => <p className="text-slate-400 text-sm text-center py-12">グラフを読み込み中...</p>,
});

// BGJポータル（/bgj/customers/[code]、売上・注文タブ）専用。得意先の
// 月次売上推移グラフと注文履歴一覧を表示する（自前で注文履歴をfetchする）。
export default function ClinicSalesOrders({ customerCode }: { customerCode: string }) {
  const [orders, setOrders] = useState<ClinicOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bgj/clinics/${customerCode}/orders`)
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data) => setOrders(data.orders ?? []))
      .finally(() => setLoading(false));
  }, [customerCode]);

  const salesHistory = useMemo(() => {
    const months: { key: string; month: string; sales: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, month: `${d.getMonth() + 1}月`, sales: 0 });
    }
    for (const o of orders) {
      const key = o.order_date.slice(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.sales += o.amount;
    }
    return months;
  }, [orders]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">月次売上推移（円）</h3>
        <SalesHistoryChart data={salesHistory} />
      </Card>
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">注文履歴</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['日付', '商品', '数量', '金額', 'ステータス'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && orders.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">注文履歴はまだありません</td></tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400 text-xs">{o.order_date}</td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{o.product_name}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs text-center">{o.quantity}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">¥{o.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
