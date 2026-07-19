'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import AdminSidebar from '../components/AdminSidebar';
import { useToast } from '@/hooks/useToast';
import { useClinicInfo } from '@/hooks/useClinicInfo';
import { useSignupPinRegenerate } from '@/hooks/useSignupPinRegenerate';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { formatTimestampCompact } from '@/lib/formatTimestamp';
import { parseJsonResponse } from '@/lib/parseJsonResponse';
import SignupQrCard from '@/components/SignupQrCard';
import type { PatientPublic } from '@/lib/supabase/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type FormState = {
  customerCode: string;
  name: string;
  password: string;
  status: PatientPublic['status'];
};

const EMPTY_FORM: FormState = { customerCode: '', name: '', password: '', status: '有効' };

export default function AdminPatientsPage() {
  const { data: session } = useSession();
  const isClinicRole = session?.user?.role === 'clinic';
  const [patients, setPatients] = useState<PatientPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<PatientPublic | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast, showToast } = useToast();
  const [showQR, setShowQR] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const { clinic, setClinic } = useClinicInfo();
  const { regenerate: handleRegenerateSignupPin, regenerating: regeneratingPin } = useSignupPinRegenerate(setClinic, showToast);
  const { submitting: saving, guard: guardSave } = useSubmitGuard();
  const { submitting: deleting, guard: guardDelete } = useSubmitGuard();
  // 得意先コードは連番で推測可能なためURLには使わず、無関係なランダム文字列である
  // signup_slugを使う。originはSSR時に取得できないため、クライアントでの
  // レンダリング時にのみ算出する（set-state-in-effectを避ける）。
  const joinUrl =
    isClinicRole && clinic?.signup_slug && typeof window !== 'undefined'
      ? `${window.location.origin}/join/${clinic.signup_slug}/mobile`
      : '';
  const signupPinIssuedAt = formatTimestampCompact(clinic?.signup_pin_issued_at);
  // QRの内容にタイムスタンプを含めることで、再発行のたびにQRの見た目自体が変わり、
  // 古いQRが窓口に貼られたままになっていないか目視でも判別しやすくする。
  const qrValue = joinUrl && signupPinIssuedAt ? `${joinUrl}?t=${signupPinIssuedAt}` : joinUrl;

  const fetchPatients = () => {
    fetch('/api/admin/patients')
      .then((res) => {
        if (!res.ok) throw new Error('患者一覧の取得に失敗しました');
        return parseJsonResponse<{ patients: PatientPublic[] }>(res);
      })
      .then((data) => setPatients(data.patients))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'エラーが発生しました');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPatients(); }, []);

  const openNew = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, customerCode: isClinicRole ? (session!.user.customerCode ?? '') : '' });
    setShowForm(true);
  };

  const openEdit = (p: PatientPublic) => {
    setEditItem(p);
    setForm({ customerCode: p.customer_code, name: p.name, password: '', status: p.status });
    setShowForm(true);
  };

  const handleSave = guardSave(async () => {
    if (!form.customerCode.trim() || !form.name.trim()) return;
    if (!editItem && !form.password.trim()) return;
    try {
      if (editItem) {
        const res = await fetch(`/api/admin/patients/${editItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerCode: form.customerCode,
            name: form.name,
            ...(form.password.trim() ? { password: form.password } : {}),
            status: form.status,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? '更新に失敗しました');
        }
        const { patient } = await parseJsonResponse<{ patient: PatientPublic }>(res);
        setPatients((prev) => prev.map((p) => (p.id === patient.id ? patient : p)));
        showToast('患者情報を更新しました');
      } else {
        const res = await fetch('/api/admin/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerCode: form.customerCode,
            name: form.name,
            password: form.password,
            status: form.status,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? '発行に失敗しました');
        }
        const { patient } = await parseJsonResponse<{ patient: PatientPublic }>(res);
        setPatients((prev) => [patient, ...prev]);
        showToast(`患者ID ${patient.patient_no}（ログインID: ${patient.login_id}）を発行しました`);
      }
      setShowForm(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    }
  });

  const handleDelete = (id: string) => guardDelete(async () => {
    try {
      const res = await fetch(`/api/admin/patients/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '削除に失敗しました');
      }
      setDeleteId(null);
      setPatients((prev) => prev.filter((p) => p.id !== id));
      showToast('患者情報を削除しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    }
  })();

  const toggleStatus = async (p: PatientPublic) => {
    const nextStatus: PatientPublic['status'] = p.status === '有効' ? '無効' : '有効';
    try {
      const res = await fetch(`/api/admin/patients/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '更新に失敗しました');
      }
      const { patient } = await parseJsonResponse<{ patient: PatientPublic }>(res);
      setPatients((prev) => prev.map((item) => (item.id === patient.id ? patient : item)));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    }
  };

  const previewAsPatient = (id: string) => {
    document.cookie = `demo-patient-id=${id}; path=/; max-age=86400; SameSite=Lax`;
    window.open('/medication', '_blank');
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="patients" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 shadow-sm">
          <div>
            <h1 className="text-slate-800 font-bold text-xl">患者様管理</h1>
            <p className="text-slate-600 text-sm mt-0.5">患者のID・パスワードを発行・管理します</p>
          </div>
          <div className="flex gap-3">
            {isClinicRole && (
              <button onClick={() => setShowQR(true)}
                className="bg-teal-500 hover:bg-teal-400 text-white text-base font-bold px-5 py-3 rounded-xl transition-colors cursor-pointer flex items-center gap-2">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/>
                </svg>
                QRで招待
              </button>
            )}
            <Button theme="sky" onClick={openNew}>
              ＋ 患者IDを発行
            </Button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-6 bg-sky-50">
          {toast && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <Card theme="sky" className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['患者番号', '得意先コード', '氏名', 'ログインID', 'パスワード', '登録日', 'ステータス', '操作'].map((h) => (
                      <th key={h} className="text-left text-slate-600 font-semibold px-5 py-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && <LoadingState variant="table-row" colSpan={8} />}
                  {!loading && patients.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">患者様がまだ登録されていません</td></tr>
                  )}
                  {patients.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/80 transition-colors">
                      <td className="px-5 py-4 text-slate-600 font-mono text-sm whitespace-nowrap">{p.patient_no}</td>
                      <td className="px-5 py-4 text-slate-700 font-mono text-sm whitespace-nowrap">{p.customer_code}</td>
                      <td className="px-5 py-4 text-slate-800 font-semibold whitespace-nowrap">{p.name}</td>
                      <td className="px-5 py-4 text-slate-700 font-mono whitespace-nowrap">{p.login_id}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-slate-400 font-mono text-sm">••••••••</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{p.registered_at}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <button onClick={() => toggleStatus(p)} className={`text-sm font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-opacity hover:opacity-70 ${
                          p.status === '有効' ? 'text-teal-700 bg-teal-50' : 'text-slate-600 bg-slate-100'
                        }`}>
                          {p.status}
                        </button>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/admin/patients/${p.id}`}
                            className="text-sm text-sky-700 hover:text-sky-600 bg-sky-50 px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium">
                            詳細
                          </Link>
                          <button onClick={() => previewAsPatient(p.id)}
                            className="text-sm text-teal-700 hover:text-teal-600 bg-teal-50 px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium">
                            患者ポータルをプレビュー
                          </button>
                          <button onClick={() => openEdit(p)}
                            className="text-sm text-blue-700 hover:text-blue-600 bg-blue-50 px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium">
                            編集
                          </button>
                          <button onClick={() => setDeleteId(p.id)}
                            className="text-sm text-red-600 hover:text-red-500 bg-red-50 px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium">
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

      {/* 追加・編集モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card theme="sky" className="p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-slate-800 font-bold text-xl mb-5">{editItem ? '患者情報を編集' : '新規患者IDを発行'}</h2>
            {!editItem && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 mb-5">
                <p className="text-sky-700 text-sm">患者番号は登録後に自動採番されます。</p>
              </div>
            )}
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">得意先コード</label>
                <input type="text" value={form.customerCode} readOnly
                  placeholder="例）A000001"
                  className="w-full border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400 bg-slate-100 cursor-not-allowed" />
                <p className="text-xs text-slate-400 mt-1.5">
                  BGJポータルで採番された得意先コードが自動的に使われます（変更不可）。
                </p>
              </div>
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">氏名</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例）山田 太郎"
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400" />
              </div>
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">ログインID</label>
                <input type="text" readOnly
                  value={editItem ? editItem.login_id : '登録後に自動採番されます'}
                  className="w-full border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none placeholder-slate-400 bg-slate-100 cursor-not-allowed" />
                <p className="text-xs text-slate-400 mt-1.5">
                  全クリニック共通の連番（BU000001〜）で自動的に発行されます（変更不可）。
                </p>
              </div>
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">{editItem ? 'パスワード再設定' : '初期パスワード'}</label>
                <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editItem ? '変更する場合のみ入力（8文字以上）' : '半角英数字8文字以上'}
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400" />
              </div>
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">ステータス</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PatientPublic['status'] })}
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40">
                  <option>有効</option>
                  <option>無効</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-base font-medium transition-colors cursor-pointer">
                キャンセル
              </button>
              <Button theme="sky" fullWidth onClick={handleSave} disabled={saving}>
                {editItem ? '更新する' : '発行する'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* QRコード招待モーダル */}
      {showQR && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card theme="sky" className="p-6 w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-slate-800 font-bold text-xl mb-1">患者様を招待する</h2>
            <p className="text-slate-500 text-sm mb-5">QRコードを患者様にお見せください。<br />当院に紐付いた状態で登録されます。</p>

            {!clinic?.signup_pin || !clinic.signup_slug ? (
              <>
                <p className="text-slate-400 text-sm mb-5">まだ受付PINが発行されていません。</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowQR(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-base font-medium cursor-pointer hover:bg-slate-50 transition-colors">
                    閉じる
                  </button>
                  <Button theme="sky" fullWidth onClick={handleRegenerateSignupPin} disabled={regeneratingPin}>
                    {regeneratingPin ? '発行中...' : '発行する'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <SignupQrCard
                  clinicName={clinic.display_name || clinic.name}
                  signupPin={clinic.signup_pin}
                  signupPinIssuedAt={signupPinIssuedAt}
                  qrValue={qrValue}
                  pdfFilename={`患者登録QR_${session?.user.customerCode ?? ''}.pdf`}
                  theme="sky"
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowQR(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-base font-medium cursor-pointer hover:bg-slate-50 transition-colors">
                    閉じる
                  </button>
                  <Button
                    theme="sky"
                    fullWidth
                    onClick={() => {
                      navigator.clipboard.writeText(qrValue);
                      setUrlCopied(true);
                      setTimeout(() => setUrlCopied(false), 2000);
                    }}
                  >
                    {urlCopied ? '✓ コピーしました' : 'URLをコピー'}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        theme="sky"
        title="削除しますか？"
        description="この操作は取り消せません。"
        disabled={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  );
}
