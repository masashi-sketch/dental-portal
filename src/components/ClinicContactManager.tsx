'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingState from '@/components/ui/LoadingState';
import ClinicContactLoginEditor from '@/components/ClinicContactLoginEditor';
import { useToast } from '@/hooks/useToast';
import { CLINIC_CONTACT_TOPIC_OPTIONS } from '@/lib/clinicContacts/topics';
import type { ClinicContact, ClinicContactChannel, ClinicContactRole, ClinicContactRoleKey, ClinicContactTopic, ClinicUserWithRole } from '@/lib/supabase/types';
import type { ClinicPortalRoleKey } from '@/lib/supabase/types';
import { INITIAL_CLINIC_LOGIN_PASSWORD } from '@/lib/clinicContacts/loginDefaults';

const TOPICS = CLINIC_CONTACT_TOPIC_OPTIONS;
const ROLE_LABEL = { admin: '管理者', staff: '一般', viewer: '閲覧専用' } as const;
type Form = {
  id: string | null; version: number; name: string; department: string; portalRoleKey: ClinicPortalRoleKey;
  roleKey: ClinicContactRoleKey; email: string; phone: string; isPrimary: boolean; status: 'active' | 'inactive';
  notes: string; emailTopics: ClinicContactTopic[]; phoneTopics: ClinicContactTopic[];
};
const emptyForm = (): Form => ({ id: null, version: 1, name: '', department: '', portalRoleKey: 'staff', roleKey: 'other', email: '', phone: '', isPrimary: false, status: 'active', notes: '', emailTopics: ['webinar'], phoneTopics: [] });

const THEMES = {
  sky: { main: 'bg-sky-500 hover:bg-sky-400', text: 'text-sky-700', pale: 'bg-sky-50 border-sky-100', toast: 'bg-sky-600', ring: 'focus:ring-sky-400' },
  violet: { main: 'bg-violet-600 hover:bg-violet-500', text: 'text-violet-700', pale: 'bg-violet-50 border-violet-100', toast: 'bg-violet-600', ring: 'focus:ring-violet-400' },
} as const;

export default function ClinicContactManager({ customerCode, theme = 'sky', manageLogins = false, canEdit = true }: { customerCode?: string; theme?: 'sky' | 'violet'; manageLogins?: boolean; canEdit?: boolean }) {
  const t = THEMES[theme];
  const [contacts, setContacts] = useState<ClinicContact[]>([]);
  const [contactRoles, setContactRoles] = useState<ClinicContactRole[]>([]);
  const [clinicUsers, setClinicUsers] = useState<ClinicUserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [loginContact, setLoginContact] = useState<ClinicContact | null>(null);
  const [issuedUser, setIssuedUser] = useState<ClinicUserWithRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();
  const query = customerCode ? `?customerCode=${encodeURIComponent(customerCode)}` : '';

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/admin/clinic-contacts${query}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '担当者情報を取得できませんでした。');
      setContacts(body.contacts ?? []); setContactRoles(body.contactRoles ?? []); setClinicUsers(body.clinicUsers ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : '担当者情報を取得できませんでした。'); }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const userMap = useMemo(() => new Map(clinicUsers.map((user) => [user.id, user])), [clinicUsers]);
  const contactRoleLabel = useMemo(() => new Map(contactRoles.map((role) => [role.role_key, role.label])), [contactRoles]);
  const openEdit = (contact: ClinicContact) => {
    const enabled = (topic: ClinicContactTopic, channel: ClinicContactChannel) => contact.preferences.some((preference) => preference.topic === topic && preference.channel === channel && preference.enabled);
    setForm({ id: contact.id, version: contact.version, name: contact.name,
      portalRoleKey: contact.clinic_user_id ? userMap.get(contact.clinic_user_id)?.role_key ?? 'staff' : 'staff',
      department: contact.department ?? '', roleKey: contact.role_key, email: contact.email ?? '', phone: contact.phone ?? '',
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
        body: JSON.stringify({ ...form, ...(customerCode ? { customerCode } : {}) }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '担当者を保存できませんでした。');
      setForm(null);
      if (!form.id && body?.clinicUser) setIssuedUser(body.clinicUser as ClinicUserWithRole);
      showToast(form.id ? '担当者を更新しました' : '担当者IDを発行しました'); await load();
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

  const refreshAuthentication = async () => {
    showToast('担当者の認証設定を更新しました');
    await load();
  };

  return <div>
    {toast && <div className={`fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-white shadow-xl ${t.toast}`}>{toast}</div>}
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-800">医院担当者</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">医院の担当者ID・スタッフ情報・認証設定を管理します。</p></div>{canEdit && <button type="button" onClick={() => setForm(emptyForm())} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white ${t.main}`}>＋ 担当者を追加</button>}</div>
    {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading ? <div className="py-16"><LoadingState /></div> : <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-sm"><thead className="border-b border-slate-200 bg-slate-50"><tr className="text-left text-xs font-semibold text-slate-500"><th className="px-3 py-3">担当者ID</th><th className="px-3 py-3">担当者名</th><th className="px-3 py-3">役職・部署</th><th className="px-3 py-3">連絡先</th><th className="px-3 py-3">担当内容</th><th className="px-3 py-3">権限</th><th className="px-3 py-3">状態</th><th className="px-3 py-3">最終ログイン</th><th className="px-3 py-3">操作</th></tr></thead><tbody>{contacts.map((contact) => {
      const enabledTopics = TOPICS.filter(({ key }) => contact.preferences.some((preference) => preference.topic === key && preference.enabled));
      const user = contact.clinic_user_id ? userMap.get(contact.clinic_user_id) : undefined;
      return <tr key={contact.id} className={`border-b border-slate-100 align-top hover:bg-slate-50 ${contact.status === 'inactive' ? 'opacity-65' : ''}`}>
        <td className="px-3 py-3 font-mono text-xs font-bold text-slate-700">{user?.login_id ?? '移行待ち'}</td>
        <td className="px-3 py-3"><div className="flex items-center gap-1.5"><span className="font-semibold text-slate-800">{contact.name}</span>{contact.is_primary && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.pale} ${t.text}`}>主担当</span>}</div></td>
        <td className="px-3 py-3 text-xs text-slate-600"><p>{contactRoleLabel.get(contact.role_key) ?? '—'}</p><p className="mt-0.5 text-slate-400">{contact.department || '—'}</p></td>
        <td className="px-3 py-3 text-xs text-slate-600"><p className="break-all">{contact.email || '—'}</p><p className="mt-0.5 whitespace-nowrap text-slate-400">{contact.phone || '—'}</p></td>
        <td className="px-3 py-3"><div className="flex max-w-[220px] flex-wrap gap-1">{enabledTopics.map(({ key, label }) => <span key={key} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{label}</span>)}{enabledTopics.length === 0 && <span className="text-xs text-slate-300">未設定</span>}</div></td>
        <td className="px-3 py-3 text-xs text-slate-600">{user ? ROLE_LABEL[user.role_key] : '—'}</td>
        <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${contact.status === 'active' && user?.status === '有効' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{contact.status === 'active' && user?.status === '有効' ? '有効' : '無効'}</span></td>
        <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{user?.last_login_at ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(user.last_login_at)) : '未ログイン'}</td>
        <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{canEdit && <><button type="button" onClick={() => openEdit(contact)} className={`rounded-lg px-2 py-1 text-xs font-bold ${t.text}`}>編集</button>{manageLogins && user && <button type="button" onClick={() => setLoginContact(contact)} className={`rounded-lg px-2 py-1 text-xs font-bold ${t.text}`}>認証設定</button>}<button type="button" disabled={saving} onClick={() => void remove(contact)} className="rounded-lg px-2 py-1 text-xs font-bold text-red-600 disabled:opacity-50">削除</button></>}</div></td>
      </tr>;
    })}{contacts.length === 0 && <tr><td colSpan={9} className="py-16 text-center text-sm text-slate-400">担当者はまだ登録されていません</td></tr>}</tbody></table></div></div>}

    {form && <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="contact-form-title"><button type="button" aria-label="閉じる" onClick={() => !saving && setForm(null)} className="absolute inset-0 bg-slate-950/45" /><section className="absolute inset-0 flex min-h-0 flex-col bg-white shadow-2xl sm:left-auto sm:w-[min(680px,94vw)]"><header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 id="contact-form-title" className="text-xl font-bold text-slate-800">{form.id ? '担当者を編集' : '担当者を追加'}</h2><button type="button" onClick={() => !saving && setForm(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">× 閉じる</button></header><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-bold text-slate-700">担当者名 *</span><input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 focus:ring-2 ${t.ring}`} /></label>{!form.id && <label><span className="text-sm font-bold text-slate-700">ポータル権限</span><select value={form.portalRoleKey} onChange={(e) => setForm({ ...form, portalRoleKey: e.target.value as ClinicPortalRoleKey })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"><option value="admin">管理者</option><option value="staff">一般</option><option value="viewer">閲覧専用</option></select></label>}</div>
      {!form.id && <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-relaxed text-violet-800">保存と同時に担当者IDを自動発行します。この担当者IDが医院ポータルへ常にログインするIDになります。</div>}
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-bold text-slate-700">部署</span><input value={form.department} maxLength={100} onChange={(e) => setForm({ ...form, department: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label><label><span className="text-sm font-bold text-slate-700">役職 *</span><select value={form.roleKey} onChange={(e) => setForm({ ...form, roleKey: e.target.value as ClinicContactRoleKey })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3">{contactRoles.map((role) => <option key={role.role_key} value={role.role_key}>{role.label}</option>)}</select></label></div>
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-bold text-slate-700">メールアドレス</span><input type="email" value={form.email} maxLength={254} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label><label><span className="text-sm font-bold text-slate-700">電話番号</span><input type="tel" value={form.phone} maxLength={30} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label></div>
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-bold text-slate-700">状態</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form['status'], isPrimary: e.target.value === 'inactive' ? false : form.isPrimary })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"><option value="active">有効</option><option value="inactive">無効</option></select></label><label className="flex items-center gap-2 pt-8"><input type="checkbox" checked={form.isPrimary} disabled={form.status === 'inactive'} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} /><span className="text-sm font-bold text-slate-700">この医院の主担当にする</span></label></div>
      <section><h3 className="text-sm font-bold text-slate-700">連絡内容と方法</h3><div className="mt-2 overflow-hidden rounded-xl border border-slate-200"><div className="grid grid-cols-[1fr_80px_80px] bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500"><span>内容</span><span className="text-center">メール</span><span className="text-center">電話</span></div>{TOPICS.map(({ key, label }) => <div key={key} className="grid grid-cols-[1fr_80px_80px] items-center border-t border-slate-100 px-3 py-2.5 text-sm"><span className="text-slate-700">{label}</span><input aria-label={`${label}をメール`} type="checkbox" disabled={!form.email} checked={form.emailTopics.includes(key)} onChange={(e) => toggleTopic('emailTopics', key, e.target.checked)} /><input aria-label={`${label}を電話`} type="checkbox" disabled={!form.phone} checked={form.phoneTopics.includes(key)} onChange={(e) => toggleTopic('phoneTopics', key, e.target.checked)} /></div>)}</div><p className="mt-1 text-xs text-slate-400">現在の自動送信対象はウェビナーのメール通知です。その他は連絡先の分類として利用します。</p></section>
      <label className="block"><span className="text-sm font-bold text-slate-700">備考</span><textarea value={form.notes} maxLength={1000} rows={3} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
    </div><footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={() => !saving && setForm(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">キャンセル</button><button type="button" disabled={saving} onClick={() => void save()} className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${t.main}`}>{saving ? '保存中…' : '保存する'}</button></footer></section></div>}
    {loginContact?.clinic_user_id && userMap.get(loginContact.clinic_user_id) && <ClinicContactLoginEditor contact={loginContact} clinicUser={userMap.get(loginContact.clinic_user_id)!} onClose={() => setLoginContact(null)} onSaved={refreshAuthentication} />}
    {issuedUser && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4" role="dialog" aria-modal="true" aria-labelledby="issued-contact-id-title"><section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><p className="text-xs font-bold text-emerald-600">担当者を登録しました</p><h2 id="issued-contact-id-title" className="mt-1 text-xl font-bold text-slate-800">担当者IDをお知らせください</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">この担当者IDが医院ポータルのログインIDです。初回ログイン時にパスワード変更が必要です。</p><dl className="mt-5 overflow-hidden rounded-xl border border-slate-200"><div className="border-b border-slate-200 px-4 py-3"><dt className="text-xs font-bold text-slate-400">担当者ID</dt><dd className="mt-1 select-all font-mono text-lg font-bold text-slate-800">{issuedUser.login_id}</dd></div><div className="px-4 py-3"><dt className="text-xs font-bold text-slate-400">初期パスワード</dt><dd className="mt-1 select-all font-mono text-lg font-bold text-slate-800">{INITIAL_CLINIC_LOGIN_PASSWORD}</dd></div></dl><button type="button" onClick={() => setIssuedUser(null)} className="mt-5 w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white">確認しました</button></section></div>}
  </div>;
}
