'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import LoadingState from '@/components/ui/LoadingState';
import type { Webinar } from '@/lib/supabase/types';

export default function AdminWebinarsPage() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void (async () => { try { const response = await fetch('/api/admin/webinars'); const body = await response.json().catch(() => null); if (!response.ok) throw new Error(body?.error ?? '取得できませんでした。'); setWebinars(body.webinars ?? []); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : '取得できませんでした。'); } finally { setLoading(false); } })(); }, []);
  return <div className="flex min-h-screen bg-sky-50"><AdminSidebar active="webinars" /><div className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0"><header className="border-b border-sky-100 bg-white px-4 py-4 shadow-sm sm:px-6"><h1 className="text-xl font-bold text-slate-800">ウェビナー</h1><p className="mt-0.5 text-sm text-slate-600">医院向けに公開されたウェビナーを確認できます</p></header><main className="flex-1 p-5 sm:p-6">{loading ? <LoadingState /> : error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : <div className="grid max-w-5xl gap-4 md:grid-cols-2">{webinars.map((webinar) => { const slot = webinar.sessions[0]; return <article key={webinar.id} className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-bold text-slate-800">{webinar.title}</h2><span className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">{slot?.provider === 'zoom' ? 'Zoom' : 'Google Meet'}</span></div>{slot && <p className="mt-2 text-sm font-semibold text-slate-600">{new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long', timeStyle: 'short', timeZone: slot.timezone }).format(new Date(slot.starts_at))}</p>}{webinar.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{webinar.description}</p>}{slot && <a href={slot.join_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-400">参加画面を開く ↗</a>}</article>; })}{webinars.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-sky-200 bg-white py-20 text-center text-sm text-slate-400">現在公開中のウェビナーはありません</div>}</div>}</main></div></div>;
}
