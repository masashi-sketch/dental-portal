'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingState from '@/components/ui/LoadingState';
import ClinicContactLoginEditor from '@/components/ClinicContactLoginEditor';
import { useToast } from '@/hooks/useToast';
import { CLINIC_CONTACT_TOPIC_OPTIONS } from '@/lib/clinicContacts/topics';
import type { ClinicContact, ClinicContactChannel, ClinicContactTopic, ClinicUserWithRole } from '@/lib/supabase/types';

const TOPICS = CLINIC_CONTACT_TOPIC_OPTIONS;
const ROLE_LABEL = { admin: '管理者', staff: '一般', viewer: '閲覧専用' } as const;
type Form = {
  id: string | null; version: number; clinicUserId: string; name: string; department: string;
  title: string; email: string; phone: string; isPrimary: boolean; status: 'active' | 'inactive';
  notes: string; emailTopics: ClinicContactTopic[]; phoneTopics: ClinicContactTopic[];
};
const emptyForm = (): Form => ({ id: null, version: 1, clinicUserId: '', name: '', department: '', title: '', email: '', phone: '', isPrimary: false, status: 'active', notes: '', emailTopics: ['webinar'], phoneTopics: [] });

const THEMES = {
  sky: { main: 'bg-sky-500 hover:bg-sky-400', text: 'text-sky-700', pale: 'bg-sky-50 border-sky-100', toast: 'bg-sky-600', ring: 'focus:ring-sky-400' },
  violet: { main: 'bg-violet-600 hover:bg-violet-500', text: 'text-violet-700', pale: 'bg-violet-50 border-violet-100', toast: 'bg-violet-600', ring: 'focus:ring-violet-400' },
} as const;

export default function ClinicContactManager({ customerCode, theme = 'sky', manageLogins = false, canEdit = true }: { customerCode?: string; theme?: 'sky' | 'violet'; manageLogins?: boolean; canEdit?: boolean }) {
  const t = THEMES[theme];
  const [contacts, setContacts] = useState<ClinicContact[]>([]);
  const [clinicUsers, setClinicUsers] = useState<ClinicUserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [loginContact, setLoginContact] = useState<ClinicContact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();
  const query = customerCode ? `?customerCode=${encodeURIComponent(customerCode)}` : '';

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/admin/clinic-contacts${query}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '担当者情報を取得できませんでした。');
      setContacts(body.contacts ?? []); setClinicUsers(body.clinicUsers ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : '担当者情報を取得できませんでした。'); }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const userMap = useMemo(() => new Map(clinicUsers.map((user) => [user.id, user])), [clinicUsers]);
  const openEdit = (contact: ClinicContact) => {
    const enabled = (topic: ClinicContactTopic, channel: ClinicContactChannel) => contact.preferences.some((preference) => preference.topic === topic && preference.channel === channel && preference.enabled);
    setForm({ id: contact.id, version: contact.version, clinicUserId: contact.clinic_user_id ?? '', name: contact.name,
      department: contact.department ?? '', title: contact.title ?? '', email: contact.email ?? '', phone: contact.phone ?? '',
      isPrimary: contact.is_primary, status: contact.status, notes: contact.notes ?? '',
      emailTopics: TOPICS.filter(({ key }) => enabled(key, 'email')).map(({ key }) => key),
      phoneTopics: TOPICS.filter(({ key }) => enabled(key, 'phone')).map(({ key }) => key) });
  };

  const save = async () => {
    if (!form || saving) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(form.id ? `/api/admin/clinic-contacts/${form.id}` : '/api/admin/clinic-contacts', {
        method: form.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clinicUserId: form.clinicUserId || null, ...(customerCode ? { customerCode } : {}) }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '担当者を保存できませんでした。');
      setForm(null); showToast(form.id ? '担当者を更新しました' : '担当者を登録しました'); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : '担当者を保存できませんでした。'); }
    finally { setSaving(false); }
  };

  const remove = async (contact: ClinicContact) => {
    if (!window.confirm(`${contact.name}さんを削除しますか？履歴は監査用に保持されます。`)) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/admin/clinic-contacts/${contact.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: contact.version }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '担当者を削除できませんでした。');
      showToast('担当者を削除しました'); await load();
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : '担当者を削除できませんでした。'); }
    finally { setSaving(false); }
  };

  const toggleTopic = (channel: 'emailTopics' | 'phoneTopics', topic: ClinicContactTopic, checked: boolean) => {
    if (!form) return;
    setForm({ ...form, [channel]: checked ? [...form[channel], topic] : form[channel].filter((item) => item !== topic) });
  };

  const linkLoginToContact = async (contact: ClinicContact) => {
    showToast(contact.clinic_user_id ? 'ログイン情報を更新しました' : 'ログインを発行して担当者に関連付けました');
    await load();
  };

  return <div>
    {toast && <div className={`fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-white shadow-xl ${t.toast}`}>{toast}</div>}
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-800">医院担当者</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">医院のスタッフ情報と個人用ログインを管理します。</p></div>{canEdit && <button type="button" onClick={() => setForm(emptyForm())} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white ${t.main}`}>＋ 担当者を追加</button>}</div>
    {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading ? <div className="py-16"><LoadingState /></div> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{contacts.map((contact) => {
      const enabledTopics = TOPICS.filter(({ key }) => contact.preferences.some((preference) => preference.topic === key && preference.enabled));
      return <article key={contact.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${contact.status === 'inactive' ? 'border-slate-200 opacity-70' : contact.is_primary ? t.pale : 'border-slate-200'}`}>
        <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-800">{contact.name}</h3>{contact.is_primary && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.pale} ${t.text}`}>主担当</span>}{contact.status === 'inactive' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">無効</span>}</div><p className="mt-1 text-xs text-slate-500">{[contact.department, contact.title].filter(Boolean).join('・') || '部署・役職未設定'}</p></div>{canEdit && <div className="flex gap-1"><button type="button" onClick={() => openEdit(contact)} className={`rounded-lg px-2 py-1 text-xs font-bold ${t.text}`}>編集</button><button type="button" disabled={saving} onClick={() => void remove(contact)} className="rounded-lg px-2 py-1 text-xs font-bold text-red-600 disabled:opacity-50">削除</button></div>}</div>
        <dl className="mt-4 space-y-2 text-sm"><div className="flex gap-2"><dt className="w-20 shrink-0 text-xs text-slate-400">メール</dt><dd className="break-all text-slate-700">{contact.email || '—'}</dd></div><div className="flex gap-2"><dt className="w-20 shrink-0 text-xs text-slate-400">電話</dt><dd className="text-slate-700">{contact.phone || '—'}</dd></div><div className="flex gap-2"><dt className="w-20 shrink-0 text-xs text-slate-400">ログイン</dt><dd className="text-slate-700">{contact.clinic_user_id ? `${userMap.get(contact.clinic_user_id)?.login_id ?? '関連あり'}（${userMap.get(contact.clinic_user_id)?.status ?? '状態不明'}）` : '未発行'}</dd></div>{contact.clinic_user_id && <><div className="flex gap-2"><dt className="w-20 shrink-0 text-xs text-slate-400">権限</dt><dd className="text-slate-700">{ROLE_LABEL[userMap.get(contact.clinic_user_id)?.role_key ?? 'staff']}</dd></div><div className="flex gap-2"><dt className="w-20 shrink-0 text-xs text-slate-400">最終ログイン</dt><dd className="text-slate-700">{userMap.get(contact.clinic_user_id)?.last_login_at ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(userMap.get(contact.clinic_user_id)!.last_login_at!)) : '未ログイン'}</dd></div></>}</dl>
        <div className="mt-3 flex flex-wrap gap-1.5">{enabledTopics.map(({ key, label }) => <span key={key} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{label}</span>)}{enabledTopics.length === 0 && <span className="text-xs text-slate-400">通知設定なし</span>}</div>
        {manageLogins && canEdit && <button type="button" onClick={() => setLoginContact(contact)} className={`mt-3 rounded-lg border px-3 py-1.5 text-xs font-bold ${theme === 'violet' ? 'border-violet-200 text-violet-700 hover:bg-violet-50' : 'border-sky-200 text-sky-700 hover:bg-sky-50'}`}>{contact.clinic_user_id ? 'ログイン情報を管理' : 'ログインIDを発行'}</button>}
      </article>;
    })}{contacts.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">担当者はまだ登録されていません</div>}</div>}

    {form && <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="contact-form-title"><button type="button" aria-label="閉じる" onClick={() => !saving && setForm(null)} className="absolute inset-0 bg-slate-950/45" /><section className="absolute inset-0 flex min-h-0 flex-col bg-white shadow-2xl sm:left-auto sm:w-[min(680px,94vw)]"><header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 id="contact-form-title" className="text-xl font-bold text-slate-800">{form.id ? '担当者を編集' : '担当者を追加'}</h2><button type="button" onClick={() => !saving && setForm(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">× 閉じる</button></header><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-bold text-slate-700">担当者名 *</span><input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 focus:ring-2 ${t.ring}`} /></label><label><span className="text-sm font-bold text-slate-700">医院ログインとの関連</span><select value={form.clinicUserId} onChange={(e) => setForm({ ...form, clinicUserId: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"><option value="">関連付けない</option>{clinicUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.login_id}（{user.login_id}）</option>)}</select></label></div>
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-bold text-slate-700">部署</span><input value={form.department} maxLength={100} onChange={(e) => setForm({ ...form, department: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label><label><span className="text-sm font-bold text-slate-700">役職</span><input value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label></div>
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-bold text-slate-700">メールアドレス</span><input type="email" value={form.email} maxLength={254} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label><label><span className="text-sm font-bold text-slate-700">電話番号</span><input type="tel" value={form.phone} maxLength={30} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label></div>
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-bold text-slate-700">状態</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form['status'], isPrimary: e.target.value === 'inactive' ? false : form.isPrimary })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"><option value="active">有効</option><option value="inactive">無効</option></select></label><label className="flex items-center gap-2 pt-8"><input type="checkbox" checked={form.isPrimary} disabled={form.status === 'inactive'} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} /><span className="text-sm font-bold text-slate-700">この医院の主担当にする</span></label></div>
      <section><h3 className="text-sm font-bold text-slate-700">連絡内容と方法</h3><div className="mt-2 overflow-hidden rounded-xl border border-slate-200"><div className="grid grid-cols-[1fr_80px_80px] bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500"><span>内容</span><span className="text-center">メール</span><span className="text-center">電話</span></div>{TOPICS.map(({ key, label }) => <div key={key} className="grid grid-cols-[1fr_80px_80px] items-center border-t border-slate-100 px-3 py-2.5 text-sm"><span className="text-slate-700">{label}</span><input aria-label={`${label}をメール`} type="checkbox" disabled={!form.email} checked={form.emailTopics.includes(key)} onChange={(e) => toggleTopic('emailTopics', key, e.target.checked)} /><input aria-label={`${label}を電話`} type="checkbox" disabled={!form.phone} checked={form.phoneTopics.includes(key)} onChange={(e) => toggleTopic('phoneTopics', key, e.target.checked)} /></div>)}</div><p className="mt-1 text-xs text-slate-400">現在の自動送信対象はウェビナーのメール通知です。その他は連絡先の分類として利用します。</p></section>
      <label className="block"><span className="text-sm font-bold text-slate-700">備考</span><textarea value={form.notes} maxLength={1000} rows={3} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
    </div><footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={() => !saving && setForm(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">キャンセル</button><button type="button" disabled={saving} onClick={() => void save()} className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${t.main}`}>{saving ? '保存中…' : '保存する'}</button></footer></section></div>}
    {loginContact && <ClinicContactLoginEditor contact={loginContact} clinicUser={loginContact.clinic_user_id ? userMap.get(loginContact.clinic_user_id) ?? null : null} onClose={() => setLoginContact(null)} onSaved={() => linkLoginToContact(loginContact)} />}
  </div>;
}
