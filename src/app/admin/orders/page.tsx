'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import DeliveryDestinationPicker from '@/components/orders/DeliveryDestinationPicker';
import { useSafeState } from '@/hooks/useSafeState';
import { useToast } from '@/hooks/useToast';
import { getSelectableOrderStatuses, ORDER_STATUS_LABEL, ORDER_STATUS_OPTIONS } from '@/lib/orders';
import type { FulfillmentMethod, PatientOrder, PatientOrderStatus, PatientPublic, Product } from '@/lib/supabase/types';

type ProductWithVisibility = Product & { isVisible: boolean };

const statusColors: Record<PatientOrderStatus, string> = {
  received: 'text-amber-700 bg-amber-50 border-amber-200',
  preparing: 'text-blue-700 bg-blue-50 border-blue-200',
  ready: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  shipped: 'text-teal-700 bg-teal-50 border-teal-200',
  completed: 'text-slate-600 bg-slate-100 border-slate-200',
  canceled: 'text-red-700 bg-red-50 border-red-200',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useSafeState<PatientOrder[]>([]);
  const [patients, setPatients] = useSafeState<PatientPublic[]>([]);
  const [products, setProducts] = useSafeState<ProductWithVisibility[]>([]);
  const [loading, setLoading] = useSafeState(true);
  const [error, setError] = useSafeState<string | null>(null);
  const [filter, setFilter] = useState<PatientOrderStatus | 'all'>('all');
  const [patientId, setPatientId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('pickup');
  const [deliveryDestinationId, setDeliveryDestinationId] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/orders/bootstrap');
      if (!response.ok) throw new Error('注文管理データを取得できませんでした');
      const data = await response.json();
      setOrders(data.orders ?? []);
      setPatients((data.patients ?? []).filter((patient: PatientPublic) => patient.status === '有効'));
      setProducts((data.products ?? []).filter((product: ProductWithVisibility) => product.isVisible));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setOrders, setPatients, setProducts]);

  useEffect(() => { load(); }, [load]);

  const createOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!patientId || !productId || saving) return;
    if (!deliveryDestinationId) { showToast('送り先を選択してください'); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId, productId, quantity, fulfillmentMethod, idempotencyKey, deliveryDestinationId,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '注文を登録できませんでした');
      setOrders((current) => [body.order, ...current]);
      setProductId('');
      setQuantity(1);
      setIdempotencyKey(crypto.randomUUID());
      showToast('患者の受け取り注文を登録しました');
    } catch (createError) {
      showToast(createError instanceof Error ? createError.message : '注文を登録できませんでした');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (order: PatientOrder, status: PatientOrderStatus) => {
    if (saving || order.status === status) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'ステータスを更新できませんでした');
      setOrders((current) => current.map((item) => item.id === order.id ? body.order : item));
      showToast('ステータスを更新しました');
    } catch (updateError) {
      showToast(updateError instanceof Error ? updateError.message : 'ステータスを更新できませんでした');
    } finally {
      setSaving(false);
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter((order) => order.status === filter);
  const summary = useMemo(() => {
    const active = orders.filter((order) => !['completed', 'canceled'].includes(order.status));
    return {
      active: active.length,
      total: active.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.unit_price * item.quantity, 0), 0),
      local: orders.filter((order) => order.source === 'internal').length,
    };
  }, [orders]);

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="orders" />
      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>}
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 shadow-sm">
          <h1 className="text-slate-800 font-bold text-xl">患者注文・受け取り管理</h1>
          <p className="text-slate-600 text-sm mt-0.5">医院で登録した進捗は患者ポータルへ反映されます</p>
        </header>

        <main className="flex-1 p-5 sm:p-6 bg-sky-50 flex flex-col gap-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <Card theme="sky" className="p-5 shadow-sm">
            <h2 className="text-slate-800 font-bold mb-4">受け取り注文を登録</h2>
            <form onSubmit={createOrder} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <label className="text-sm text-slate-600">患者
                <select value={patientId} onChange={(event) => { setPatientId(event.target.value); setDeliveryDestinationId(''); }} required className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800">
                  <option value="">選択してください</option>
                  {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}（{patient.patient_no}）</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-600 md:col-span-2">商品
                <select value={productId} onChange={(event) => setProductId(event.target.value)} required className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800">
                  <option value="">選択してください</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}（¥{product.price.toLocaleString()}）</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-600">数量
                <input type="number" min={1} max={100} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800" />
              </label>
              <label className="text-sm text-slate-600">受け取り方法
                <select value={fulfillmentMethod} onChange={(event) => { setFulfillmentMethod(event.target.value as FulfillmentMethod); setDeliveryDestinationId(''); }} className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-800">
                  <option value="pickup">医院で受け取り</option><option value="delivery">自宅へ配送</option>
                </select>
              </label>
              {patientId && <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 md:col-span-5"><DeliveryDestinationPicker apiBase="/api/admin/delivery-destinations" patientId={fulfillmentMethod === 'delivery' ? patientId : undefined} ownerLabel={fulfillmentMethod === 'pickup' ? '医院の受け取り先' : '患者の自宅配送先'} selectedId={deliveryDestinationId} onSelect={setDeliveryDestinationId} color="sky" onError={showToast} /></div>}
              <button disabled={saving || !patientId || !productId || !deliveryDestinationId} className="md:col-start-5 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? '登録中…' : '注文を登録'}</button>
            </form>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card theme="sky" className="p-5"><p className="text-sm text-slate-500">進行中</p><p className="text-3xl font-bold text-slate-800">{summary.active}<span className="text-base font-normal ml-1">件</span></p></Card>
            <Card theme="sky" className="p-5"><p className="text-sm text-slate-500">進行中の注文金額</p><p className="text-3xl font-bold text-slate-800">¥{summary.total.toLocaleString()}</p></Card>
            <Card theme="sky" className="p-5"><p className="text-sm text-slate-500">内部登録</p><p className="text-3xl font-bold text-slate-800">{summary.local}<span className="text-base font-normal ml-1">件</span></p><p className="mt-1 text-xs text-slate-400">Shopify連携後は連携元を識別します</p></Card>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-sm ${filter === 'all' ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 border'}`}>すべて ({orders.length})</button>
            {ORDER_STATUS_OPTIONS.map((status) => <button key={status} onClick={() => setFilter(status)} className={`px-4 py-2 rounded-xl text-sm ${filter === status ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 border'}`}>{ORDER_STATUS_LABEL[status]} ({orders.filter((order) => order.status === status).length})</button>)}
          </div>

          <Card theme="sky" className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100">{['注文日時','患者','商品','受け取り','金額','連携元','状態','変更'].map((heading) => <th key={heading} className="px-4 py-4 text-left font-semibold text-slate-600 whitespace-nowrap">{heading}</th>)}</tr></thead>
                <tbody>
                  {loading && <LoadingState variant="table-row" colSpan={8} />}
                  {!loading && filtered.map((order) => {
                    const amount = order.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
                    return <tr key={order.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{new Date(order.ordered_at).toLocaleString('ja-JP')}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800 whitespace-nowrap">{order.patient?.name ?? '—'}</td>
                      <td className="px-4 py-4 text-slate-700">{order.items.map((item) => `${item.product_name} × ${item.quantity}`).join('、')}</td>
                      <td className="px-4 py-4 text-slate-600 whitespace-nowrap">{order.fulfillment_method === 'pickup' ? '医院' : '自宅配送'}{order.delivery_destination && <p className="mt-1 max-w-48 truncate text-xs text-slate-400" title={`〒${order.delivery_destination.postal_code} ${order.delivery_destination.prefecture}${order.delivery_destination.city}${order.delivery_destination.address_line1}`}>〒{order.delivery_destination.postal_code} {order.delivery_destination.prefecture}{order.delivery_destination.city}{order.delivery_destination.address_line1}</p>}</td>
                      <td className="px-4 py-4 font-mono font-semibold whitespace-nowrap">¥{amount.toLocaleString()}</td>
                      <td className="px-4 py-4 text-slate-500">{order.source === 'internal' ? '医院登録' : 'Shopify'}</td>
                      <td className="px-4 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${statusColors[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span></td>
                      <td className="px-4 py-4"><select disabled={saving || ['completed','canceled'].includes(order.status)} value={order.status} onChange={(event) => updateStatus(order, event.target.value as PatientOrderStatus)} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 disabled:opacity-50">{getSelectableOrderStatuses(order.status, order.fulfillment_method).map((status) => <option key={status} value={status}>{ORDER_STATUS_LABEL[status]}</option>)}</select></td>
                    </tr>;
                  })}
                  {!loading && filtered.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-slate-400">該当する注文はありません</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
