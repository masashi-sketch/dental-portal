'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function ClinicChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true); setError('');
    const response = await fetch('/api/clinic-change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, confirmation }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? 'パスワードを変更できませんでした。');
      setSaving(false);
      return;
    }
    document.cookie = 'portal-selected=; path=/; max-age=0; SameSite=Lax';
    await signOut({ callbackUrl: '/clinic-login?reason=password-changed' });
  };

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
    <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-7 shadow-2xl">
      <p className="text-sm font-bold text-teal-600">医院用ポータル</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">初回パスワード変更</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">安全のため、初期パスワードから新しいパスワードへ変更してください。変更後は新しいパスワードで再ログインします。</p>
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="mt-6 space-y-4">
        <label className="block"><span className="text-sm font-bold text-slate-700">新しいパスワード</span><input aria-label="新しいパスワード" type="password" autoComplete="new-password" value={password} maxLength={128} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-teal-400" /><span className="mt-1 block text-xs text-slate-500">8〜128文字。初期パスワードと同じ値は使用できません。</span></label>
        <label className="block"><span className="text-sm font-bold text-slate-700">新しいパスワード（確認）</span><input aria-label="新しいパスワード（確認）" type="password" autoComplete="new-password" value={confirmation} maxLength={128} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-teal-400" /></label>
        <button type="button" disabled={saving} onClick={() => void save()} className="w-full rounded-xl bg-teal-600 py-3 font-bold text-white hover:bg-teal-500 disabled:opacity-50">{saving ? '変更中…' : 'パスワードを変更'}</button>
      </div>
    </section>
  </main>;
}

