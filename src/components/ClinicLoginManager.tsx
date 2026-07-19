'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import type { ClinicUserPublic } from '@/lib/supabase/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';

// BGJポータル（/bgj/customers/[code]、ログイン管理タブ）専用。医院側の
// ログインID・パスワードをBGJ職員が代理発行・再設定・有効/無効切り替えする。
// customerCodeに閉じたclinic_usersのみを扱う。
export default function ClinicLoginManager({
  customerCode,
  defaultName,
  theme = 'violet',
}: {
  customerCode: string;
  defaultName?: string;
  theme?: 'sky' | 'violet';
}) {
  const { toast, showToast } = useToast();
  const [clinicUsers, setClinicUsers] = useState<ClinicUserPublic[]>([]);
  const [clinicUsersLoading, setClinicUsersLoading] = useState(true);
  const [newLoginForm, setNewLoginForm] = useState({ loginId: '', password: '', name: defaultName ?? '', email: '' });
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [editEmailId, setEditEmailId] = useState<string | null>(null);
  const [editEmailValue, setEditEmailValue] = useState('');
  const [savingLoginAction, setSavingLoginAction] = useState(false);

  const fetchClinicUsers = useCallback(() => {
    fetch(`/api/bgj/clinics/${customerCode}/user`)
      .then((res) => (res.ok ? res.json() : { clinicUsers: [] }))
      .then((data) => setClinicUsers(data.clinicUsers ?? []))
      .finally(() => setClinicUsersLoading(false));
  }, [customerCode]);

  useEffect(() => { fetchClinicUsers(); }, [fetchClinicUsers]);

  const handleCreateLogin = async () => {
    if (!newLoginForm.loginId.trim() || !newLoginForm.password.trim()) {
      showToast('ログインIDと初期パスワードを入力してください');
      return;
    }
    setCreatingLogin(true);
    try {
      const res = await fetch(`/api/bgj/clinics/${customerCode}/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLoginForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '作成に失敗しました');
      }
      const { clinicUser } = await res.json();
      setClinicUsers((prev) => [clinicUser, ...prev]);
      showToast('ログインを発行しました');
      setNewLoginForm({ loginId: '', password: '', name: '', email: '' });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setCreatingLogin(false);
    }
  };

  const handleEditEmail = async (id: string) => {
    setSavingLoginAction(true);
    try {
      const res = await fetch(`/api/bgj/clinics/${customerCode}/user`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email: editEmailValue.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '更新に失敗しました');
      }
      const { clinicUser } = await res.json();
      setClinicUsers((prev) => prev.map((u) => (u.id === clinicUser.id ? clinicUser : u)));
      showToast('メールアドレスを更新しました');
      setEditEmailId(null);
      setEditEmailValue('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSavingLoginAction(false);
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!resetPasswordValue.trim()) return;
    setSavingLoginAction(true);
    try {
      const res = await fetch(`/api/bgj/clinics/${customerCode}/user`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: resetPasswordValue }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '更新に失敗しました');
      }
      const { clinicUser } = await res.json();
      setClinicUsers((prev) => prev.map((u) => (u.id === clinicUser.id ? clinicUser : u)));
      showToast('パスワードを再設定しました');
      setResetPasswordId(null);
      setResetPasswordValue('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSavingLoginAction(false);
    }
  };

  const handleToggleLoginStatus = async (user: ClinicUserPublic) => {
    setSavingLoginAction(true);
    try {
      const res = await fetch(`/api/bgj/clinics/${customerCode}/user`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: user.status === '有効' ? '無効' : '有効' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '更新に失敗しました');
      }
      const { clinicUser } = await res.json();
      setClinicUsers((prev) => prev.map((u) => (u.id === clinicUser.id ? clinicUser : u)));
      showToast(user.status === '有効' ? '無効化しました' : '有効化しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSavingLoginAction(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}

      <Card theme={theme} className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-1">医院ログイン一覧</h3>
        <p className="text-xs text-slate-400 mb-4">
          ここで発行したログインID・パスワードで、医院側が「/clinic-login」から自分の得意先コードに閉じたセッションでログインできます。
        </p>
        {clinicUsersLoading ? (
          <LoadingState />
        ) : clinicUsers.length === 0 ? (
          <p className="text-slate-400 text-sm">まだログインは発行されていません。</p>
        ) : (
          <div className="flex flex-col gap-3">
            {clinicUsers.map((u) => (
              <div key={u.id} className="border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{u.login_id}</p>
                    <p className="text-xs text-slate-400">{u.name || '担当者名未設定'}</p>
                    {editEmailId === u.id ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          type="email"
                          placeholder="メールアドレス"
                          value={editEmailValue}
                          onChange={(e) => setEditEmailValue(e.target.value)}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                        <button
                          onClick={() => handleEditEmail(u.id)}
                          disabled={savingLoginAction}
                          className="text-xs text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 font-semibold px-2 py-1 rounded-lg"
                        >
                          確定
                        </button>
                        <button
                          onClick={() => { setEditEmailId(null); setEditEmailValue(''); }}
                          className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditEmailId(u.id); setEditEmailValue(u.email ?? ''); }}
                        className="text-xs text-slate-400 hover:text-violet-600 mt-1"
                      >
                        {u.email || 'メール未登録'}（編集）
                      </button>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    u.status === '有効' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {u.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  {resetPasswordId === u.id ? (
                    <>
                      <input
                        type="text"
                        placeholder="新しいパスワード"
                        value={resetPasswordValue}
                        onChange={(e) => setResetPasswordValue(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        disabled={savingLoginAction}
                        className="text-xs text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 font-semibold px-3 py-1.5 rounded-lg"
                      >
                        確定
                      </button>
                      <button
                        onClick={() => { setResetPasswordId(null); setResetPasswordValue(''); }}
                        className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setResetPasswordId(u.id); setResetPasswordValue(''); }}
                        className="text-xs text-violet-600 hover:text-violet-800 font-semibold"
                      >
                        パスワード再設定
                      </button>
                      <button
                        onClick={() => handleToggleLoginStatus(u)}
                        disabled={savingLoginAction}
                        className="text-xs text-slate-500 hover:text-slate-700 font-semibold disabled:opacity-50"
                      >
                        {u.status === '有効' ? '無効化する' : '有効化する'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card theme={theme} className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">新規ログインを発行</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">ログインID</label>
            <input value={newLoginForm.loginId}
              onChange={(e) => setNewLoginForm({ ...newLoginForm, loginId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">初期パスワード</label>
            <input value={newLoginForm.password}
              onChange={(e) => setNewLoginForm({ ...newLoginForm, password: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">担当者名（任意）</label>
            <input value={newLoginForm.name}
              onChange={(e) => setNewLoginForm({ ...newLoginForm, name: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">メールアドレス（任意）</label>
            <input type="email" value={newLoginForm.email}
              placeholder="パスワードをお忘れの方に必要"
              onChange={(e) => setNewLoginForm({ ...newLoginForm, email: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
        </div>
        <Button theme={theme} size="sm" onClick={handleCreateLogin} disabled={creatingLogin}>
          {creatingLogin ? '発行中...' : '発行する'}
        </Button>
      </Card>
    </div>
  );
}
