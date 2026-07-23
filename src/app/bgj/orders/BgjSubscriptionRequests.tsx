'use client';

import { useCallback, useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import type { PatientSubscriptionRequest, SubscriptionRequestStatus } from '@/lib/supabase/types';

const LABEL: Record<SubscriptionRequestStatus, string> = { submitted: '受付中', approved: '連携準備承認', rejected: '却下', canceled: '取消' };
const CLASS: Record<SubscriptionRequestStatus, string> = {
  submitted: 'border-amber-200 bg-amber-50 text-amber-700', approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700', canceled: 'border-slate-200 bg-slate-100 text-slate-600',
};

function requestCode(value: number) { return `SUB-${String(value).padStart(8, '0')}`; }

export default function BgjSubscriptionRequests() {
  const [requests, setRequests] = useState<PatientSubscriptionRequest[]>([]);
  const [status, setStatus] = useState<SubscriptionRequestStatus | ''>('');
  const [customerInput, setCustomerInput] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (customerCode) params.set('customerCode', customerCode);
      const response = await fetch(`/api/bgj/subscription-requests?${params}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '定期購入申込を取得できませんでした。');
      setRequests(body.requests ?? []); setError(null);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : '定期購入申込を取得できませんでした。'); }
    finally { setLoading(false); }
  }, [customerCode, status]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const transition = async (item: PatientSubscriptionRequest, next: 'approved' | 'rejected' | 'canceled') => {
    let reason: string | null = null;
    if (next === 'rejected') { reason = window.prompt('却下理由を入力してください。')?.trim() ?? ''; if (!reason) return; }
    if (next !== 'rejected' && !window.confirm(`${LABEL[next]}へ更新しますか？`)) return;
    setUpdating(item.id);
    try {
      const response = await fetch(`/api/bgj/subscription-requests/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next, version: item.version, reason }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '更新できませんでした。');
      await load();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : '更新できませんでした。'); }
    finally { setUpdating(null); }
  };

  return <>
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
      ここでは患者から届いた申込を審査します。「連携準備承認」は契約・決済・受注の成立ではなく、Shopify連携対象として確認済みであることを示します。
    </div>
    {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <Card className="mb-4 p-4"><form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setCustomerCode(customerInput.trim()); }}>
      <select value={status} onChange={(event) => setStatus(event.target.value as SubscriptionRequestStatus | '')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">すべての状態</option>{Object.entries(LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input value={customerInput} onChange={(event) => setCustomerInput(event.target.value)} placeholder="得意先コード" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      <button className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white">検索</button>
    </form></Card>
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{['申込日時', '申込番号', '医院／患者', '商品', 'コース／受取', '月額', '送り先', '状態', '操作'].map((value) => <th key={value} className="px-4 py-3">{value}</th>)}</tr></thead><tbody>
      {loading && <LoadingState variant="table-row" colSpan={9} />}
      {!loading && requests.map((item) => { const line = item.items?.[0]; const destination = item.destination; return <tr key={item.id} className="border-t border-slate-100 align-top">
        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{new Date(item.submitted_at).toLocaleString('ja-JP')}</td>
        <td className="px-4 py-4 font-mono text-xs font-semibold">{requestCode(item.request_number)}</td>
        <td className="px-4 py-4"><strong>{item.clinic?.name ?? '—'}</strong><p className="font-mono text-xs text-slate-400">{item.customer_code}</p><p className="mt-1">{item.patient?.name ?? '—'}（{item.patient?.patient_no ?? '—'}）</p></td>
        <td className="px-4 py-4">{line?.product_name ?? '—'} × {line?.quantity ?? 0}</td>
        <td className="px-4 py-4">{item.term_months}ヶ月／{item.fulfillment_method === 'delivery' ? '自宅配送' : '医院受取'}</td>
        <td className="whitespace-nowrap px-4 py-4 font-mono">¥{((line?.unit_price ?? 0) * (line?.quantity ?? 0)).toLocaleString()}</td>
        <td className="max-w-64 px-4 py-4 text-xs text-slate-600">{destination ? `〒${destination.postal_code} ${destination.prefecture}${destination.city}${destination.address_line1}` : '—'}</td>
        <td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${CLASS[item.status]}`}>{LABEL[item.status]}</span></td>
        <td className="px-4 py-4"><div className="flex flex-col gap-2">
          {item.status === 'submitted' && <><button disabled={updating === item.id} onClick={() => void transition(item, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">承認</button><button disabled={updating === item.id} onClick={() => void transition(item, 'rejected')} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-40">却下</button></>}
          {item.status === 'approved' && <button disabled={updating === item.id} onClick={() => void transition(item, 'canceled')} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">取消</button>}
        </div></td>
      </tr>; })}
      {!loading && requests.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">該当する定期購入申込はありません</td></tr>}
    </tbody></table></div></Card>
  </>;
}
