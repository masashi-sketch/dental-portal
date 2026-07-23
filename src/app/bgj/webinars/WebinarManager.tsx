'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingState from '@/components/ui/LoadingState';
import WebinarRecipientSelector, { type WebinarClinicOption, type WebinarContactOption } from './WebinarRecipientSelector';
import type { ClinicContactRole, ClinicContactRoleKey, Webinar, WebinarProvider } from '@/lib/supabase/types';

type FormState = {
  id: string | null; version: number; title: string; description: string;
  provider: WebinarProvider; startsAt: string; endsAt: string; timezone: string;
  joinUrl: string; externalSpaceId: string | null; calendarEventUrl: string | null;
  customerCodes: string[]; contactIds: string[];
};

const emptyForm = (): FormState => ({ id: null, version: 1, title: '', description: '', provider: 'google_meet', startsAt: '', endsAt: '', timezone: 'Asia/Tokyo', joinUrl: '', externalSpaceId: null, calendarEventUrl: null, customerCodes: [], contactIds: [] });
const statusLabel = { draft: '下書き', published: '公開中', canceled: '中止' } as const;
const statusClass = { draft: 'bg-slate-100 text-slate-600', published: 'bg-emerald-100 text-emerald-700', canceled: 'bg-red-100 text-red-700' } as const;

function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function WebinarManager() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [clinics, setClinics] = useState<WebinarClinicOption[]>([]);
  const [contacts, setContacts] = useState<WebinarContactOption[]>([]);
  const [contactRoles, setContactRoles] = useState<ClinicContactRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [issuingMeet, setIssuingMeet] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/bgj/webinars');
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'ウェビナーを取得できませんでした。');
      setWebinars(body.webinars ?? []); setClinics(body.clinics ?? []);
      setContacts(body.contacts ?? []); setContactRoles(body.contactRoles ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'ウェビナーを取得できませんでした。'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const edit = (webinar: Webinar) => {
    const slot = webinar.sessions[0];
    if (!slot) return;
    setForm({ id: webinar.id, version: webinar.version, title: webinar.title, description: webinar.description ?? '', provider: slot.provider, startsAt: toLocalInput(slot.starts_at), endsAt: toLocalInput(slot.ends_at), timezone: slot.timezone, joinUrl: slot.join_url, externalSpaceId: slot.external_space_id, calendarEventUrl: null, customerCodes: webinar.target_clinics.map((target) => target.customer_code), contactIds: webinar.target_contacts.map((target) => target.contact_id) });
  };

  const close = () => {
    if (saving) return;
    if (form && (form.title || form.joinUrl || form.customerCodes.length) && !window.confirm('入力内容を破棄して閉じますか？')) return;
    setForm(null);
  };

  const save = async () => {
    if (!form || saving) return;
    if (!form.startsAt || !form.endsAt) { setError('開始日時と終了日時を入力してください。'); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch('/api/bgj/webinars', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '保存できませんでした。');
      setForm(null); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : '保存できませんでした。'); }
    finally { setSaving(false); }
  };

  const issueGoogleMeet = async () => {
    if (!form || issuingMeet || saving) return;
    if (!form.title.trim() || !form.startsAt || !form.endsAt) {
      setError('タイトル・開始日時・終了日時を入力してからMeetを発行してください。');
      return;
    }
    if (form.joinUrl && !window.confirm('現在の参加URLを新しく発行するGoogle Meet URLへ置き換えますか？')) return;
    setIssuingMeet(true); setError(null);
    try {
      const response = await fetch('/api/bgj/webinars/google-meet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, description: form.description,
          startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(),
          timezone: form.timezone,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Google Meetを発行できませんでした。');
      setForm((current) => current ? { ...current, joinUrl: body.joinUrl, externalSpaceId: body.externalSpaceId, calendarEventUrl: body.calendarEventUrl ?? null } : current);
    } catch (issueError) { setError(issueError instanceof Error ? issueError.message : 'Google Meetを発行できませんでした。'); }
    finally { setIssuingMeet(false); }
  };

  const transition = async (webinar: Webinar, status: 'published' | 'canceled') => {
    const message = status === 'published' ? '対象医院へ公開し、登録メールアドレスへ案内を送信します。よろしいですか？' : 'このウェビナーを中止しますか？';
    if (!window.confirm(message)) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/bgj/webinars/${webinar.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, version: webinar.version }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '状態を更新できませんでした。');
      await load();
    } catch (transitionError) { setError(transitionError instanceof Error ? transitionError.message : '状態を更新できませんでした。'); }
    finally { setSaving(false); }
  };

  const roleLabels = useMemo(() => new Map<ClinicContactRoleKey, string>(contactRoles.map((role) => [role.role_key, role.label])), [contactRoles]);

  return <>
    <div className="flex justify-end"><button type="button" onClick={() => setForm(emptyForm())} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-500">＋ 新規ウェビナー</button></div>
    {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading ? <div className="py-24"><LoadingState /></div> : (
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {webinars.map((webinar) => { const slot = webinar.sessions[0]; return (
          <article key={webinar.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[webinar.status]}`}>{statusLabel[webinar.status]}</span><h2 className="mt-3 text-lg font-bold text-slate-800">{webinar.title}</h2></div><span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">{slot?.provider === 'zoom' ? 'Zoom' : 'Google Meet'}</span></div>
            <p className="mt-2 text-sm text-slate-500">{slot ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short', timeZone: slot.timezone }).format(new Date(slot.starts_at)) : '開催枠なし'} ・ 対象 {webinar.target_clinics.length}医院</p>
            {webinar.description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{webinar.description}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {webinar.status === 'draft' && <><button type="button" onClick={() => edit(webinar)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">編集</button><button type="button" disabled={saving} onClick={() => void transition(webinar, 'published')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">公開する</button></>}
              {webinar.status !== 'canceled' && <button type="button" disabled={saving} onClick={() => void transition(webinar, 'canceled')} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">中止</button>}
              {webinar.status === 'published' && slot && <a href={slot.join_url} target="_blank" rel="noreferrer" className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700">参加URLを確認 ↗</a>}
            </div>
          </article>
        ); })}
        {webinars.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center text-sm text-slate-400">ウェビナーはまだありません</div>}
      </div>
    )}

    {form && <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="webinar-form-title">
      <button type="button" aria-label="閉じる" onClick={close} className="absolute inset-0 bg-slate-950/45" />
      <section className="absolute inset-0 flex min-h-0 flex-col bg-white shadow-2xl sm:left-auto sm:w-[min(720px,94vw)]">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-bold tracking-widest text-violet-500">ウェビナー管理</p><h2 id="webinar-form-title" className="mt-1 text-xl font-bold text-slate-800">{form.id ? '下書きを編集' : '新規ウェビナー'}</h2></div><button type="button" onClick={close} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">× 閉じる</button></header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <label className="block"><span className="text-sm font-bold text-slate-700">タイトル</span><input value={form.title} maxLength={200} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">説明</span><textarea value={form.description} maxLength={5000} rows={4} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-bold text-slate-700">配信サービス</span><select value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value as WebinarProvider, joinUrl: '', externalSpaceId: null, calendarEventUrl: null })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"><option value="google_meet">Google Meet</option><option value="zoom">Zoom</option></select></label><label><span className="text-sm font-bold text-slate-700">タイムゾーン</span><input value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-bold text-slate-700">開始日時</span><input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label><label><span className="text-sm font-bold text-slate-700">終了日時</span><input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label></div>
          <div className="block"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold text-slate-700">参加URL</span>{form.provider === 'google_meet' && <button type="button" disabled={issuingMeet || saving} onClick={() => void issueGoogleMeet()} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50">{issuingMeet ? 'Google Calendarで発行中…' : form.externalSpaceId ? 'Meetを再発行' : 'Google CalendarでMeetを発行'}</button>}</div><input type="url" value={form.joinUrl} placeholder={form.provider === 'google_meet' ? '「Google CalendarでMeetを発行」を押すか、URLを入力' : 'https://us02web.zoom.us/j/...'} onChange={(event) => setForm({ ...form, joinUrl: event.target.value, externalSpaceId: null, calendarEventUrl: null })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /><span className="mt-1 block text-xs text-slate-400">{form.externalSpaceId ? <>Google Calendarに予定を作成しました。{form.calendarEventUrl && <a href={form.calendarEventUrl} target="_blank" rel="noreferrer" className="ml-1 font-semibold text-blue-600">予定を確認 ↗</a>}</> : '手動で発行した実在URLも登録できます。'}</span></div>
          <WebinarRecipientSelector clinics={clinics} contacts={contacts} roleLabels={roleLabels} selectedContactIds={form.contactIds} onChange={(customerCodes, contactIds) => setForm({ ...form, customerCodes, contactIds })} />
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">キャンセル</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? '保存中…' : '下書きを保存'}</button></footer>
      </section>
    </div>}
  </>;
}
