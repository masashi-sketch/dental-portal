'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PatientSubscriptionRequest, SubscriptionRequestStatus } from '@/lib/supabase/types';

const LABEL: Record<SubscriptionRequestStatus, string> = { submitted: '受付中', approved: '連携準備承認', rejected: '却下', canceled: '取消' };

export default function SubscriptionRequestsPanel() {
  const [requests, setRequests] = useState<PatientSubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/patient-portal/subscription-requests');
      if (response.status === 401) { setRequests([]); return; }
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '申込履歴を取得できませんでした。');
      setRequests(body.requests ?? []); setError(null);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : '申込履歴を取得できませんでした。'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const cancel = async (item: PatientSubscriptionRequest) => {
    if (!window.confirm('この申込を取り消しますか？')) return;
    setUpdating(item.id);
    try {
      const response = await fetch(`/api/patient-portal/subscription-requests/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: item.version }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '申込を取り消せませんでした。');
      await load();
    } catch (cancelError) { setError(cancelError instanceof Error ? cancelError.message : '申込を取り消せませんでした。'); }
    finally { setUpdating(null); }
  };
  if (loading) return <div className="rounded-2xl border border-gray-100 bg-white p-5 text-sm text-gray-400">申込履歴を読み込んでいます…</div>;
  if (requests.length === 0 && !error) return null;
  return <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <h2 className="font-bold text-gray-900">定期購入の申込状況</h2>
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    <div className="mt-3 space-y-3">{requests.map((item) => <article key={item.id} className="rounded-xl border border-gray-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-xs text-gray-400">SUB-{String(item.request_number).padStart(8, '0')}</p><p className="mt-1 font-semibold text-gray-900">{item.items?.[0]?.product_name ?? '定期購入商品'} × {item.items?.[0]?.quantity ?? 1}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{LABEL[item.status]}</span></div>
      <p className="mt-2 text-xs text-gray-500">{item.term_months}ヶ月コース／{item.fulfillment_method === 'delivery' ? '自宅配送' : '医院受け取り'}／{new Date(item.submitted_at).toLocaleDateString('ja-JP')}</p>
      {item.status === 'submitted' && <button disabled={updating === item.id} onClick={() => void cancel(item)} className="mt-3 text-xs font-semibold text-red-600 disabled:opacity-40">申込を取り消す</button>}
    </article>)}</div>
  </section>;
}
