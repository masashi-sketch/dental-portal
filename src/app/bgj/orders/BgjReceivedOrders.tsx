'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import {
  COMMERCE_SOURCE_LABEL,
  COMMERCE_SYNC_STATUS_LABEL,
  FULFILLMENT_METHOD_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_CREATED_VIA_LABEL,
  ORDER_TYPE_LABEL,
} from '@/lib/orders';
import type { BgjOrdersResponse, OrderIntegrationRecord } from '@/lib/orderIntegration';
import type { CommerceSource, CommerceSyncStatus, PatientOrderStatus } from '@/lib/supabase/types';
import BgjCreateOrderSheet from './BgjCreateOrderSheet';

const STATUS_CLASS: Record<PatientOrderStatus, string> = {
  received: 'bg-amber-50 text-amber-700 border-amber-200',
  preparing: 'bg-blue-50 text-blue-700 border-blue-200',
  ready: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  shipped: 'bg-teal-50 text-teal-700 border-teal-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
  canceled: 'bg-red-50 text-red-700 border-red-200',
};

const SYNC_CLASS: Record<CommerceSyncStatus, string> = {
  local: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-700',
  synced: 'bg-emerald-50 text-emerald-700',
  error: 'bg-red-50 text-red-700',
};

const STATUS_OPTIONS = Object.keys(ORDER_STATUS_LABEL) as PatientOrderStatus[];
const SOURCE_OPTIONS = Object.keys(COMMERCE_SOURCE_LABEL) as CommerceSource[];
const SYNC_OPTIONS = Object.keys(COMMERCE_SYNC_STATUS_LABEL) as CommerceSyncStatus[];

function OrderStatusBadge({ order }: { order: OrderIntegrationRecord }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[order.status]}`}>
      {ORDER_STATUS_LABEL[order.status]}
    </span>
  );
}

function SyncStatusBadge({ order }: { order: OrderIntegrationRecord }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${SYNC_CLASS[order.syncStatus]}`}
      title={order.syncError ?? undefined}
    >
      {COMMERCE_SYNC_STATUS_LABEL[order.syncStatus]}
    </span>
  );
}

function OrderReference({ order }: { order: OrderIntegrationRecord }) {
  return (
    <div className="whitespace-nowrap">
      <p className="font-mono text-xs font-semibold text-slate-700">{order.externalOrderId ?? order.orderId.slice(0, 8)}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{ORDER_CREATED_VIA_LABEL[order.createdVia]}</p>
    </div>
  );
}

export default function BgjReceivedOrders() {
  const [orders, setOrders] = useState<OrderIntegrationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PatientOrderStatus | ''>('');
  const [source, setSource] = useState<CommerceSource | ''>('');
  const [syncStatus, setSyncStatus] = useState<CommerceSyncStatus | ''>('');
  const [customerCodeInput, setCustomerCodeInput] = useState('');
  const [externalOrderIdInput, setExternalOrderIdInput] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [externalOrderId, setExternalOrderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (source) params.set('source', source);
    if (syncStatus) params.set('syncStatus', syncStatus);
    if (customerCode) params.set('customerCode', customerCode);
    if (externalOrderId) params.set('externalOrderId', externalOrderId);

    try {
      const response = await fetch(`/api/bgj/orders?${params.toString()}`);
      const body = await response.json().catch(() => null) as BgjOrdersResponse | { error?: string } | null;
      if (!response.ok || !body || !('orders' in body)) {
        throw new Error(body && 'error' in body ? body.error : '受注一覧を取得できませんでした');
      }
      setOrders(body.orders);
      setTotal(body.total);
      setPageSize(body.pageSize);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '受注一覧を取得できませんでした');
    } finally {
      setLoading(false);
    }
  }, [customerCode, externalOrderId, page, source, status, syncStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadOrders(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const displayedAmount = useMemo(() => orders.reduce((sum, order) => sum + order.totalAmount, 0), [orders]);
  const displayedSyncErrors = orders.filter((order) => order.syncStatus === 'error').length;

  const resetPage = () => setPage(1);
  const applyReferenceFilters = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setCustomerCode(customerCodeInput.trim());
    setExternalOrderId(externalOrderIdInput.trim());
  };

  const handleCreated = async () => {
    setCreateOpen(false);
    setToast('受注を登録しました。');
    window.setTimeout(() => setToast(null), 3000);
    await loadOrders();
  };

  return (
    <>
      {toast && <div role="status" className="fixed left-1/2 top-5 z-[60] -translate-x-1/2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 sm:flex-row sm:items-center sm:justify-between">
        <p>患者注文の実データを全医院横断で表示しています。外部注文IDと同期状態は連携用の正規化項目で、Shopify等への送受信処理は接続仕様確定後に追加します。</p>
        <button type="button" onClick={() => setCreateOpen(true)} className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500">＋ 新規受注</button>
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void loadOrders()} className="font-semibold underline">再読み込み</button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-slate-500">検索結果</p><p className="mt-1 text-2xl font-bold text-slate-800">{total}<span className="ml-1 text-sm font-normal">件</span></p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">表示中の注文金額</p><p className="mt-1 text-2xl font-bold text-slate-800">¥{displayedAmount.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">表示中の連携エラー</p><p className={`mt-1 text-2xl font-bold ${displayedSyncErrors ? 'text-red-600' : 'text-slate-800'}`}>{displayedSyncErrors}<span className="ml-1 text-sm font-normal">件</span></p></Card>
      </div>

      <Card className="mb-4 p-4">
        <form onSubmit={applyReferenceFilters} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <label className="text-xs font-semibold text-slate-500">業務状態
          <select value={status} onChange={(event) => { resetPage(); setStatus(event.target.value as PatientOrderStatus | ''); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="">すべて</option>
            {STATUS_OPTIONS.map((value) => <option key={value} value={value}>{ORDER_STATUS_LABEL[value]}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">連携元
          <select value={source} onChange={(event) => { resetPage(); setSource(event.target.value as CommerceSource | ''); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="">すべて</option>
            {SOURCE_OPTIONS.map((value) => <option key={value} value={value}>{COMMERCE_SOURCE_LABEL[value]}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">外部同期
          <select value={syncStatus} onChange={(event) => { resetPage(); setSyncStatus(event.target.value as CommerceSyncStatus | ''); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="">すべて</option>
            {SYNC_OPTIONS.map((value) => <option key={value} value={value}>{COMMERCE_SYNC_STATUS_LABEL[value]}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">得意先コード
          <input value={customerCodeInput} onChange={(event) => setCustomerCodeInput(event.target.value)} maxLength={50} placeholder="得意先コードを入力" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" />
        </label>
        <label className="text-xs font-semibold text-slate-500 xl:col-span-2">外部注文ID
          <input value={externalOrderIdInput} onChange={(event) => setExternalOrderIdInput(event.target.value)} maxLength={100} placeholder="Shopify等の注文ID" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" />
        </label>
        <button type="submit" className="self-end rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">検索</button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div data-testid="bgj-orders-table" className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>{['注文日時', '注文番号', '得意先', '患者', '商品', '種別／受取', '金額', '業務状態', '外部同期'].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{heading}</th>)}</tr>
            </thead>
            <tbody>
              {loading && <LoadingState variant="table-row" colSpan={9} />}
              {!loading && orders.map((order) => (
                <tr key={order.orderId} className="border-b border-slate-100 last:border-0 hover:bg-violet-50/40">
                  <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">{new Date(order.orderedAt).toLocaleString('ja-JP')}</td>
                  <td className="px-4 py-4"><OrderReference order={order} /></td>
                  <td className="px-4 py-4 whitespace-nowrap"><Link href={`/bgj/customers/${order.clinic.customerCode}`} className="font-semibold text-violet-700 hover:underline">{order.clinic.name ?? '—'}</Link><p className="font-mono text-[11px] text-slate-400">{order.clinic.customerCode}</p></td>
                  <td className="px-4 py-4 whitespace-nowrap"><Link href={`/bgj/patients/${order.patient.id}`} className="font-semibold text-slate-800 hover:text-violet-700 hover:underline">{order.patient.name ?? '—'}</Link><p className="font-mono text-[11px] text-slate-400">{order.patient.patientNo ?? '—'}</p></td>
                  <td className="max-w-xs px-4 py-4 text-slate-700">{order.lines.map((line) => <p key={line.lineId}>{line.productName} × {line.quantity}</p>)}</td>
                  <td className="px-4 py-4 text-xs text-slate-600 whitespace-nowrap"><p>{ORDER_TYPE_LABEL[order.orderType]}</p><p className="mt-1">{FULFILLMENT_METHOD_LABEL[order.fulfillmentMethod]}</p></td>
                  <td className="px-4 py-4 font-mono font-semibold whitespace-nowrap">¥{order.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-4"><OrderStatusBadge order={order} /></td>
                  <td className="px-4 py-4"><SyncStatusBadge order={order} />{order.syncError && <p className="mt-1 max-w-48 truncate text-[11px] text-red-600" title={order.syncError}>{order.syncError}</p>}</td>
                </tr>
              ))}
              {!loading && orders.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">該当する患者注文はありません</td></tr>}
            </tbody>
          </table>
        </div>

        <div data-testid="bgj-orders-cards" className="divide-y divide-slate-100 lg:hidden">
          {loading && <div className="p-5"><LoadingState /></div>}
          {!loading && orders.map((order) => (
            <article key={order.orderId} className="p-4">
              <div className="flex items-start justify-between gap-3"><OrderReference order={order} /><OrderStatusBadge order={order} /></div>
              <p className="mt-3 text-sm font-semibold text-slate-800">{order.patient.name ?? '—'} <span className="font-mono text-xs font-normal text-slate-400">{order.patient.patientNo ?? '—'}</span></p>
              <Link href={`/bgj/customers/${order.clinic.customerCode}`} className="mt-1 block text-xs text-violet-700 hover:underline">{order.clinic.name ?? '—'}（{order.clinic.customerCode}）</Link>
              <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{order.lines.map((line) => <p key={line.lineId}>{line.productName} × {line.quantity}</p>)}</div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{new Date(order.orderedAt).toLocaleString('ja-JP')}</span><strong className="font-mono text-base text-slate-800">¥{order.totalAmount.toLocaleString()}</strong></div>
              <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500">{ORDER_TYPE_LABEL[order.orderType]}／{FULFILLMENT_METHOD_LABEL[order.fulfillmentMethod]}</span><SyncStatusBadge order={order} /></div>
              {order.syncError && <p className="mt-2 text-xs text-red-600">{order.syncError}</p>}
            </article>
          ))}
          {!loading && orders.length === 0 && <p className="px-4 py-12 text-center text-sm text-slate-400">該当する患者注文はありません</p>}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>{page} / {totalPages} ページ</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">前へ</button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">次へ</button>
            </div>
          </div>
        )}
      </Card>
      <BgjCreateOrderSheet open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </>
  );
}
