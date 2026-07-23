'use client';

import { useState } from 'react';
import type { ClinicContact, ClinicPortalRoleKey, ClinicUserWithRole } from '@/lib/supabase/types';

type LoginForm = {
  loginId: string;
  password: string;
  email: string;
  status: '有効' | '無効';
  roleKey: ClinicPortalRoleKey;
};

export default function ClinicContactLoginEditor({
  contact,
  clinicUser,
  onClose,
  onSaved,
}: {
  contact: ClinicContact;
  clinicUser: ClinicUserWithRole | null;
  onClose: () => void;
  onSaved: (clinicUser: ClinicUserWithRole) => Promise<void>;
}) {
  const [form, setForm] = useState<LoginForm>({
    loginId: clinicUser?.login_id ?? '',
    password: '',
    email: clinicUser?.email ?? contact.email ?? '',
    status: clinicUser?.status ?? '有効',
    roleKey: clinicUser?.role_key ?? 'staff',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (saving) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/admin/clinic-contacts/${contact.id}/login`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: form.loginId, password: form.password || undefined, email: form.email, status: form.status, roleKey: form.roleKey }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'ログイン情報を保存できませんでした。');
      await onSaved(body.clinicUser as ClinicUserWithRole);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'ログイン情報を保存できませんでした。');
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="clinic-login-editor-title">
    <button type="button" aria-label="閉じる" onClick={() => !saving && onClose()} className="absolute inset-0 bg-slate-950/45" />
    <section className="absolute inset-0 flex min-h-0 flex-col bg-white shadow-2xl sm:left-auto sm:w-[min(560px,94vw)]">
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div><p className="text-xs font-bold text-violet-600">{contact.name}</p><h2 id="clinic-login-editor-title" className="mt-0.5 text-xl font-bold text-slate-800">医院ポータルログイン</h2></div>
        <button type="button" onClick={() => !saving && onClose()} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">× 閉じる</button>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <label className="block"><span className="text-sm font-bold text-slate-700">ログインID *</span><input autoComplete="off" value={form.loginId} maxLength={100} onChange={(event) => setForm({ ...form, loginId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 focus:ring-2 focus:ring-violet-400" /></label>
        <label className="block"><span className="text-sm font-bold text-slate-700">{clinicUser ? '新しいパスワード（変更時のみ）' : '初期パスワード *'}</span><input type="password" autoComplete="new-password" value={form.password} maxLength={128} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 focus:ring-2 focus:ring-violet-400" /><span className="mt-1 block text-xs text-slate-400">8〜128文字。保存後にパスワードを表示することはできません。</span></label>
        <label className="block"><span className="text-sm font-bold text-slate-700">パスワード再設定用メール</span><input type="email" value={form.email} maxLength={254} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 focus:ring-2 focus:ring-violet-400" /></label>
        <label className="block"><span className="text-sm font-bold text-slate-700">権限区分</span><select value={form.roleKey} onChange={(event) => setForm({ ...form, roleKey: event.target.value as ClinicPortalRoleKey })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"><option value="admin">管理者</option><option value="staff">一般</option><option value="viewer">閲覧専用</option></select><span className="mt-1 block text-xs text-slate-400">担当者とログインを管理できるのは管理者だけです。</span></label>
        {clinicUser && <label className="block"><span className="text-sm font-bold text-slate-700">ログイン状態</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as LoginForm['status'] })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"><option value="有効">有効</option><option value="無効">無効</option></select></label>}
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">ログインIDはこの担当者に関連付けて管理します。担当者の業務連絡用メールと、ログインのパスワード再設定用メールは用途を分離したまま保持します。</div>
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={() => !saving && onClose()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">キャンセル</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50">{saving ? '保存中…' : clinicUser ? '変更を保存' : 'ログインを発行'}</button></footer>
    </section>
  </div>;
}
