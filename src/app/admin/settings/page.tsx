'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AdminSidebar from '../components/AdminSidebar';
import SalesRepAvatar from '@/components/SalesRepAvatar';
import type { Clinic, ClinicTerms, SalesRepWithMaster } from '@/lib/supabase/types';

type ClinicWithStaff = Clinic & { staff: SalesRepWithMaster | null };

const NAV_TOGGLE_ITEMS: { key: 'navShowClinicInfo' | 'navShowMedication' | 'navShowSubscription' | 'navShowShop' | 'navShowQa'; label: string }[] = [
  { key: 'navShowClinicInfo', label: 'クリニック紹介' },
  { key: 'navShowMedication', label: 'お薬の受け取り' },
  { key: 'navShowSubscription', label: '定期購入' },
  { key: 'navShowShop', label: 'おすすめ商品' },
  { key: 'navShowQa', label: 'Q & A' },
];

export default function AdminSettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isClinicRole = session?.user?.role === 'clinic';

  const [savedCode, setSavedCode] = useState('');
  const [toast, setToast] = useState('');
  const [terms, setTerms] = useState<ClinicTerms | null>(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [clinic, setClinic] = useState<ClinicWithStaff | null>(null);
  const [brandingForm, setBrandingForm] = useState({ displayName: '', patientBackgroundUrl: '' });
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [navForm, setNavForm] = useState({
    navShowClinicInfo: true,
    navShowMedication: true,
    navShowSubscription: true,
    navShowShop: true,
    navShowQa: true,
  });
  const [navSaving, setNavSaving] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'loading' || !isClinicRole) return;
    // クリニックログインは自分の得意先コードに固定（切替不可）
    setSavedCode(session!.user.customerCode ?? '');
  }, [sessionStatus, isClinicRole, session]);

  useEffect(() => {
    if (!isClinicRole || !savedCode) return;
    fetch(`/api/admin/clinic-info?customerCode=${encodeURIComponent(savedCode)}`)
      .then((res) => (res.ok ? res.json() : { clinic: null }))
      .then((data) => {
        if (data.clinic) {
          setClinic(data.clinic);
          setBrandingForm({
            displayName: data.clinic.display_name ?? '',
            patientBackgroundUrl: data.clinic.patient_background_url ?? '',
          });
          setNavForm({
            navShowClinicInfo: data.clinic.nav_show_clinic_info,
            navShowMedication: data.clinic.nav_show_medication,
            navShowSubscription: data.clinic.nav_show_subscription,
            navShowShop: data.clinic.nav_show_shop,
            navShowQa: data.clinic.nav_show_qa,
          });
        }
      })
      .catch(() => {});
  }, [isClinicRole, savedCode]);

  useEffect(() => {
    if (!isClinicRole || !savedCode) {
      setTerms(null);
      return;
    }
    let cancelled = false;
    setTermsLoading(true);
    fetch('/api/admin/clinic-terms')
      .then((res) => (res.ok ? res.json() : { terms: null }))
      .then((data) => { if (!cancelled) setTerms(data.terms ?? null); })
      .catch(() => { if (!cancelled) setTerms(null); })
      .finally(() => { if (!cancelled) setTermsLoading(false); });
    return () => { cancelled = true; };
  }, [savedCode, isClinicRole]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

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
      setClinic(clinic);
      showToast('ブランディング設定を保存しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleSaveNav = async () => {
    setNavSaving(true);
    try {
      const res = await fetch('/api/admin/clinic-info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(navForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '保存に失敗しました');
      }
      const { clinic } = await res.json();
      setClinic(clinic);
      showToast('患者ポータルの表示設定を保存しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setNavSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="settings" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 shadow-sm">
          <h1 className="text-slate-800 font-bold text-xl">医院設定</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            {isClinicRole ? 'ログイン中の医院の設定を確認できます' : 'BGJ職員向けの得意先ごとの設定はBGJポータルから行います'}
          </p>
        </header>

        <main className="flex-1 p-5 sm:p-6">
          {toast && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
          )}

          {!isClinicRole && (
            <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 shadow-sm max-w-2xl">
              <p className="text-sm font-bold text-slate-700 mb-1">この画面はクリニックログイン専用です</p>
              <p className="text-slate-500 text-sm mb-4">
                得意先ごとの基本情報・取引条件・ブランディング設定は、BGJポータルの「得意先一覧」から確認・編集できます。
              </p>
              <Link
                href="/bgj/customers"
                className="inline-block bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                BGJポータルの得意先一覧へ
              </Link>
            </div>
          )}

          {isClinicRole && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl">
              {/* 左カラム：BGJが管理する情報（読み取り専用） */}
              <div className="flex flex-col gap-5">
                <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <p className="text-sm font-bold text-slate-700 mb-4">基本情報</p>
                  {clinic ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                      {[
                        ['医院名', clinic.name],
                        ['得意先コード', clinic.customer_code],
                        ['エリア', clinic.area],
                        ['住所', clinic.address || '—'],
                        ['電話番号', clinic.tel || '—'],
                        ['担当者', clinic.contact_person || '—'],
                        ['取引開始日', clinic.contract_since || '—'],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                          <p className="text-sm text-slate-800 font-semibold">{value}</p>
                        </div>
                      ))}
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">担当営業</p>
                        {clinic.staff ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            <SalesRepAvatar name={clinic.staff.name} photoUrl={clinic.staff.photo_url} size={24} className="text-xs" />
                            <p className="text-sm text-slate-800 font-semibold">{clinic.staff.name}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-800 font-semibold">未割当</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">読み込み中...</p>
                  )}
                  <p className="text-xs text-slate-400 mt-4">この情報はBGJポータル側で管理されています。変更のご希望はバイオガイア担当者までお問い合わせください。</p>
                </div>

                <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 shadow-sm">
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
              </div>

              {/* 右カラム：クリニック自身が編集できる設定 */}
              <div className="flex flex-col gap-5">
                {clinic && (
                  <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 shadow-sm">
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
                          placeholder={clinic.name}
                          className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400"
                        />
                        <p className="text-xs text-slate-400 mt-1">未入力の場合は「{clinic.name}」がそのまま表示されます。</p>
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

                {clinic && (
                  <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                    <p className="text-sm font-bold text-slate-700 mb-1">患者ポータルの表示設定</p>
                    <p className="text-xs text-slate-400 mb-4">
                      患者様ポータルのメニューに表示する項目を選べます。チェックを外すと、患者様には表示されなくなります（「ホーム」は常に表示されます）。
                    </p>
                    <div className="flex flex-col gap-2.5">
                      {NAV_TOGGLE_ITEMS.map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={navForm[key]}
                            onChange={(e) => setNavForm({ ...navForm, [key]: e.target.checked })}
                            className="w-4 h-4 accent-sky-500"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={handleSaveNav}
                      disabled={navSaving}
                      className="mt-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-base font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer"
                    >
                      {navSaving ? '保存中...' : '保存する'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
