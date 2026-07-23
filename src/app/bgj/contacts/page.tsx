'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import { CLINIC_CONTACT_TOPIC_LABEL, CLINIC_CONTACT_TOPIC_OPTIONS } from '@/lib/clinicContacts/topics';
import type { BgjClinicContactListItem, ClinicContactRole, ClinicContactTopic } from '@/lib/supabase/types';

type TopicFilter = 'all' | ClinicContactTopic;

function enabledTopics(contact: BgjClinicContactListItem) {
  return [...new Set(contact.preferences.filter((preference) => preference.enabled).map((preference) => preference.topic))];
}

export default function BgjContactsPage() {
  const [contacts, setContacts] = useState<BgjClinicContactListItem[]>([]);
  const [contactRoles, setContactRoles] = useState<ClinicContactRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [customerCode, setCustomerCode] = useState('all');
  const [roleKey, setRoleKey] = useState('all');
  const [status, setStatus] = useState('active');
  const [topic, setTopic] = useState<TopicFilter>('all');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/bgj/clinic-contacts', { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error ?? '担当者一覧を取得できませんでした。');
        setContacts(body.contacts ?? []); setContactRoles(body.contactRoles ?? []); setError(null);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
        setError(loadError instanceof Error ? loadError.message : '担当者一覧を取得できませんでした。');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const clinics = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((contact) => map.set(contact.customer_code, contact.clinic?.name ?? contact.customer_code));
    return [...map].sort((a, b) => a[0].localeCompare(b[0], 'ja'));
  }, [contacts]);
  const roleLabel = useMemo(() => new Map(contactRoles.map((role) => [role.role_key, role.label])), [contactRoles]);
  const topicCounts = useMemo(() => Object.fromEntries(CLINIC_CONTACT_TOPIC_OPTIONS.map(({ key }) => [key, contacts.filter((contact) => contact.status === 'active' && enabledTopics(contact).includes(key)).length])) as Record<ClinicContactTopic, number>, [contacts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      const searchable = [contact.customer_code, contact.clinic?.name, contact.name, contact.department, roleLabel.get(contact.role_key), contact.email, contact.phone, contact.clinic_user?.login_id].filter(Boolean).join(' ').toLowerCase();
      return (!query || searchable.includes(query))
        && (customerCode === 'all' || contact.customer_code === customerCode)
        && (roleKey === 'all' || contact.role_key === roleKey)
        && (status === 'all' || contact.status === status)
        && (topic === 'all' || enabledTopics(contact).includes(topic));
    });
  }, [contacts, customerCode, roleKey, roleLabel, search, status, topic]);

  const activeCount = contacts.filter((contact) => contact.status === 'active').length;
  const primaryCount = contacts.filter((contact) => contact.status === 'active' && contact.is_primary).length;

  return <div className="p-4 sm:p-6">
    <header className="mb-6"><h1 className="text-xl font-bold text-slate-800">担当者一覧</h1><p className="mt-0.5 text-sm text-slate-500">医院ごとの業務連絡担当者と担当内容を横断して確認します</p></header>

    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <Card className="p-4"><p className="text-xs font-semibold text-slate-400">登録担当者</p><p className="mt-1 text-2xl font-bold text-slate-800">{contacts.length}<span className="ml-1 text-sm font-semibold text-slate-400">名</span></p></Card>
      <Card className="p-4"><p className="text-xs font-semibold text-slate-400">有効な担当者</p><p className="mt-1 text-2xl font-bold text-emerald-600">{activeCount}<span className="ml-1 text-sm font-semibold text-slate-400">名</span></p></Card>
      <Card className="p-4"><p className="text-xs font-semibold text-slate-400">主担当者</p><p className="mt-1 text-2xl font-bold text-violet-600">{primaryCount}<span className="ml-1 text-sm font-semibold text-slate-400">名</span></p></Card>
    </div>

    <Card className="mb-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <input aria-label="担当者を検索" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="得意先・役職・担当者名・連絡先で検索" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-400" />
        <select aria-label="得意先で絞り込み" value={customerCode} onChange={(event) => setCustomerCode(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">すべての得意先</option>{clinics.map(([code, name]) => <option key={code} value={code}>{name}（{code}）</option>)}</select>
        <select aria-label="役職で絞り込み" value={roleKey} onChange={(event) => setRoleKey(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">すべての役職</option>{contactRoles.map((role) => <option key={role.role_key} value={role.role_key}>{role.label}</option>)}</select>
        <select aria-label="状態で絞り込み" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="active">有効のみ</option><option value="inactive">無効のみ</option><option value="all">すべての状態</option></select>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setTopic('all')} className={`rounded-full px-3 py-1.5 text-xs font-bold ${topic === 'all' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>すべて</button>{CLINIC_CONTACT_TOPIC_OPTIONS.map((option) => <button key={option.key} type="button" onClick={() => setTopic(option.key)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${topic === option.key ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700'}`}>{option.label} {topicCounts[option.key]}</button>)}</div>
    </Card>

    {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading ? <Card className="py-20"><LoadingState /></Card> : <Card className="overflow-hidden">
      <div className="overflow-x-auto"><table className="min-w-[1050px] w-full"><thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500"><th className="px-4 py-3">得意先</th><th className="px-4 py-3">担当者ID</th><th className="px-4 py-3">役職</th><th className="px-4 py-3">担当者名</th><th className="px-4 py-3">担当内容</th><th className="px-4 py-3">メール</th><th className="px-4 py-3">電話番号</th></tr></thead><tbody>
        {filtered.map((contact) => {
          const topics = enabledTopics(contact);
          return <tr key={contact.id} className="border-b border-slate-100 align-top transition-colors hover:bg-violet-50/40">
            <td className="px-4 py-4"><Link href={`/bgj/customers/${contact.customer_code}`} className="font-semibold text-violet-700 hover:underline">{contact.clinic?.name ?? '医院名未設定'}</Link><p className="mt-0.5 font-mono text-[11px] text-slate-400">{contact.customer_code}</p></td>
            <td className="px-4 py-4 text-xs"><p className="font-mono font-bold text-slate-700">{contact.clinic_user?.login_id ?? '移行待ち'}</p></td>
            <td className="px-4 py-4 text-sm text-slate-600"><p>{roleLabel.get(contact.role_key) ?? '—'}</p>{contact.department && <p className="mt-0.5 text-xs text-slate-400">{contact.department}</p>}</td>
            <td className="px-4 py-4"><div className="flex flex-wrap items-center gap-1.5"><span className="font-semibold text-slate-800">{contact.name}</span>{contact.is_primary && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">主担当</span>}{contact.status === 'inactive' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">無効</span>}</div></td>
            <td className="px-4 py-4"><div className="flex max-w-[280px] flex-wrap gap-1">{topics.map((key) => <span key={key} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{CLINIC_CONTACT_TOPIC_LABEL[key]}</span>)}{topics.length === 0 && <span className="text-xs text-slate-300">未設定</span>}</div></td>
            <td className="max-w-[220px] break-all px-4 py-4 text-xs text-slate-600">{contact.email ?? '—'}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{contact.phone ?? '—'}</td>
          </tr>;
        })}
        {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-20 text-center text-sm text-slate-400">条件に一致する担当者はいません</td></tr>}
      </tbody></table></div><div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">{filtered.length}名表示（全{contacts.length}名）</div>
    </Card>}
  </div>;
}
