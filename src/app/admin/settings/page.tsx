'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import AdminSidebar from '../components/AdminSidebar';
import type { Clinic, ClinicTerms } from '@/lib/supabase/types';

const COOKIE_NAME = 'active-customer-code';

function readActiveCustomerCode(): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export default function AdminSettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isClinicRole = session?.user?.role === 'clinic';

  const [selectedCode, setSelectedCode] = useState('');
  const [savedCode, setSavedCode] = useState('');
  const [toast, setToast] = useState('');
  const [terms, setTerms] = useState<ClinicTerms | null>(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [brandingForm, setBrandingForm] = useState({ displayName: '', patientBackgroundUrl: '' });
  const [brandingSaving, setBrandingSaving] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    // クリニックログインは自分の得意先コードに固定（切替不可）
    if (isClinicRole) {
      setSelectedCode(session!.user.customerCode ?? '');
      setSavedCode(session!.user.customerCode ?? '');
      return;
    }

    const current = readActiveCustomerCode();
    setSelectedCode(current);
    setSavedCode(current);
    fetch('/api/bgj/clinics')
      .then((res) => (res.ok ? res.json() : { clinics: [] }))
      .then((data) => setClinics(data.clinics ?? []))
      .catch(() => setClinics([]));
  }, [sessionStatus, isClinicRole, session]);

  // クリニックログインは/api/bgj/*にアクセスできないため一覧取得はスキップし、
  // 自院の情報だけを/api/admin/clinic-infoから取得する
  useEffect(() => {
    if (!isClinicRole || !savedCode) return;
    fetch(`/api/admin/clinic-info?customerCode=${encodeURIComponent(savedCode)}`)
      .then((res) => (res.ok ? res.json() : { clinic: null }))
      .then((data) => {
        if (data.clinic) {
          setClinics([data.clinic]);
          setBrandingForm({
            displayName: data.clinic.display_name ?? '',
            patientBackgroundUrl: data.clinic.patient_background_url ?? '',
          });
        }
      })
      .catch(() => {});
  }, [isClinicRole, savedCode]);

  useEffect(() => {
    if (!savedCode) {
      setTerms(null);
      return;
    }
    let cancelled = false;
    setTermsLoading(true);
    const termsUrl = isClinicRole
      ? '/api/admin/clinic-terms'
      : `/api/bgj/clinic-terms/${savedCode}`;
    fetch(termsUrl)
      .then((res) => (res.ok ? res.json() : { terms: null }))
      .then((data) => { if (!cancelled) setTerms(data.terms ?? null); })
      .catch(() => { if (!cancelled) setTerms(null); })
      .finally(() => { if (!cancelled) setTermsLoading(false); });
    return () => { cancelled = true; };
  }, [savedCode, isClinicRole]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleSave = () => {
    if (!selectedCode) return;
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(selectedCode)}; path=/; max-age=31536000; SameSite=Lax`;
    setSavedCode(selectedCode);
    showToast('この医院ポータルに紐づく得意先を設定しました');
  };

  const handleSaveBranding = async () => {
    setBrandingSaving(true);
    try {
      const res = await fetch('/api/admin/clinic-info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandingForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '保存に失敗しました');
      }
      const { clinic } = await res.json();
      setClinics([clinic]);
      showToast('ブランディング設定を保存しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setBrandingSaving(false);
    }
  };

  const savedClinic = clinics.find((c) => c.customer_code === savedCode);

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="settings" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 shadow-sm">
          <h1 className="text-slate-800 font-bold text-xl">医院設定</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            {isClinicRole ? 'ログイン中の医院の設定を確認できます' : 'この医院ポータルに紐づく得意先を選択します'}
          </p>
        </header>

        <main className="flex-1 p-5 sm:p-6 max-w-2xl">
          {toast && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
          )}

          <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 shadow-sm mb-5">
            <p className="text-sm font-bold text-slate-700 mb-1">現在の設定</p>
            {savedClinic ? (
              <div className="flex items-center gap-3 mt-2">
                <span className="font-mono text-sm text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded-lg">{savedClinic.customer_code}</span>
                <span className="text-slate-800 font-semibold">{savedClinic.name}</span>
                <span className="text-slate-400 text-xs">（{savedClinic.area}）</span>
              </div>
            ) : (
              <p className="text-slate-400 text-sm mt-2">まだ設定されていません。下記から選択してください。</p>
            )}
          </div>

          {savedClinic && (
            <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 shadow-sm mb-5">
              <p className="text-sm font-bold text-slate-700 mb-3">取引条件</p>
              {termsLoading ? (
                <p className="text-slate-400 text-sm">読み込み中...</p>
              ) : terms ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                  {[
                    ['コミッション率', `${terms.commission_rate}%`],
                    ['仕切値率', `${terms.wholesale_rate}%`],
                    ['支払条件（サイト）', terms.payment_terms_site || '—'],
                    ['支払方法', terms.payment_method || '—'],
                    ['契約開始日', terms.contract_started_at || '—'],
                    ['次回更新日', terms.contract_renewal_at || '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm text-slate-800 font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">取引条件はまだ設定されていません。BGJポータル側での設定をお待ちください。</p>
              )}
            </div>
          )}

          {isClinicRole && savedClinic && (
            <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 shadow-sm mb-5">
              <p className="text-sm font-bold text-slate-700 mb-1">ブランディング設定</p>
              <p className="text-xs text-slate-400 mb-4">
                患者様ポータル・医院用ポータルに表示される名称と、患者様ポータルのログイン画面の背景画像を設定できます。
              </p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">表示名</label>
                  <input
                    type="text"
                    value={brandingForm.displayName}
                    onChange={(e) => setBrandingForm({ ...brandingForm, displayName: e.target.value })}
                    placeholder={savedClinic.name}
                    className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">未入力の場合は「{savedClinic.name}」がそのまま表示されます。</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様ポータルの背景画像URL</label>
                  <input
                    type="text"
                    value={brandingForm.patientBackgroundUrl}
                    onChange={(e) => setBrandingForm({ ...brandingForm, patientBackgroundUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">未入力の場合は標準の背景画像が使われます。</p>
                </div>
              </div>
              <button
                onClick={handleSaveBranding}
                disabled={brandingSaving}
                className="mt-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-base font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer"
              >
                {brandingSaving ? '保存中...' : '保存する'}
              </button>
            </div>
          )}

          {!isClinicRole && (
          <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 shadow-sm">
            <label className="text-slate-700 text-base mb-2 block font-medium">得意先を選択</label>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 mb-4"
            >
              <option value="">選択してください</option>
              {clinics.map((c) => (
                <option key={c.customer_code} value={c.customer_code}>{c.customer_code}・{c.name}（{c.area}）</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mb-4">
              得意先の一覧はBGJポータルの「得意先一覧」で管理している内容と同じものです。ここで選択した得意先コードが、患者様管理の新規登録画面に自動入力されます。
            </p>
            <button
              onClick={handleSave}
              disabled={!selectedCode}
              className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-base font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer"
            >
              この得意先で設定する
            </button>
          </div>
          )}
        </main>
      </div>
    </div>
  );
}
