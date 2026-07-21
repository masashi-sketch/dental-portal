'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '../../components/AdminSidebar';
import { useToast } from '@/hooks/useToast';
import { useClinicInfo } from '@/hooks/useClinicInfo';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

type NavToggleKey =
  | 'navShowClinicInfo'
  | 'navShowMedicalRecord'
  | 'navShowMedication'
  | 'navShowSubscription'
  | 'navShowShop'
  | 'navShowQa';

const NAV_TOGGLE_ITEMS: { key: NavToggleKey; label: string }[] = [
  { key: 'navShowClinicInfo', label: 'クリニック紹介' },
  { key: 'navShowMedicalRecord', label: '診療情報' },
  { key: 'navShowMedication', label: 'サプリメントの受け取り' },
  { key: 'navShowSubscription', label: '定期購入' },
  { key: 'navShowShop', label: 'おすすめ商品' },
  { key: 'navShowQa', label: 'Q & A' },
];

export default function AdminClinicConfigPage() {
  const { toast, showToast } = useToast();
  const [brandingForm, setBrandingForm] = useState({ displayName: '', patientBackgroundUrl: '' });
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [navForm, setNavForm] = useState<Record<NavToggleKey, boolean>>({
    navShowClinicInfo: true,
    navShowMedicalRecord: true,
    navShowMedication: true,
    navShowSubscription: true,
    navShowShop: true,
    navShowQa: true,
  });
  const [navSaving, setNavSaving] = useState(false);
  const [showPeriodontalDiagnosis, setShowPeriodontalDiagnosis] = useState(true);
  const [periodontalSaving, setPeriodontalSaving] = useState(false);

  const { isClinicRole, clinic, setClinic } = useClinicInfo((fetchedClinic) => {
    if (!fetchedClinic) return;
    setBrandingForm({
      displayName: fetchedClinic.display_name ?? '',
      patientBackgroundUrl: fetchedClinic.patient_background_url ?? '',
    });
    setNavForm({
      navShowClinicInfo: fetchedClinic.nav_show_clinic_info,
      navShowMedicalRecord: fetchedClinic.nav_show_medical_record,
      navShowMedication: fetchedClinic.nav_show_medication,
      navShowSubscription: fetchedClinic.nav_show_subscription,
      navShowShop: fetchedClinic.nav_show_shop,
      navShowQa: fetchedClinic.nav_show_qa,
    });
    setShowPeriodontalDiagnosis(fetchedClinic.show_periodontal_diagnosis);
  });

  const handleToggleNav = (key: NavToggleKey, checked: boolean) => {
    if (!checked) {
      const otherKeysChecked = NAV_TOGGLE_ITEMS.some(({ key: k }) => k !== key && navForm[k]);
      if (!otherKeysChecked) {
        showToast('患者ポータルのメニューは、少なくとも1つ表示にする必要があります');
        return;
      }
    }
    setNavForm({ ...navForm, [key]: checked });
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
      const { clinic: updated } = await res.json();
      setClinic((prev) => (prev ? { ...prev, ...updated } : prev));
      showToast('ブランディング設定を保存しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleBackgroundUpload = async (file: File) => {
    setBackgroundUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/clinic-info/upload-background', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '背景画像のアップロードに失敗しました');
      }
      const { url } = await res.json();
      setBrandingForm((current) => ({ ...current, patientBackgroundUrl: url }));
      showToast('背景画像をアップロードしました。「保存する」を押すと患者ポータルへ反映されます');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setBackgroundUploading(false);
    }
  };

  const handleSavePeriodontal = async () => {
    setPeriodontalSaving(true);
    try {
      const res = await fetch('/api/admin/clinic-info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showPeriodontalDiagnosis }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '保存に失敗しました');
      }
      const { clinic: updated } = await res.json();
      setClinic((prev) => (prev ? { ...prev, ...updated } : prev));
      showToast('歯周病表示の設定を保存しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setPeriodontalSaving(false);
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
      const { clinic: updated } = await res.json();
      setClinic((prev) => (prev ? { ...prev, ...updated } : prev));
      showToast('患者ポータルの表示設定を保存しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setNavSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="clinicConfig" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 shadow-sm">
          <h1 className="text-slate-800 font-bold text-xl">医院設定情報</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            {isClinicRole ? 'ブランディング・歯周病表示・患者ポータルの表示を設定できます' : 'BGJ職員向けの得意先ごとの設定はBGJポータルから行います'}
          </p>
        </header>

        <main className="flex-1 p-5 sm:p-6">
          {toast && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
          )}

          {!isClinicRole && (
            <Card theme="sky" className="p-5 sm:p-6 shadow-sm max-w-2xl">
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
            </Card>
          )}

          {isClinicRole && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl">
              {/* 左カラム：ブランディング設定・歯周病表示 */}
              <div className="flex flex-col gap-5">
              {clinic && (
                <Card theme="sky" className="p-5 sm:p-6 shadow-sm">
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
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様ポータルの背景画像</label>
                      {brandingForm.patientBackgroundUrl && (
                        <div
                          role="img"
                          aria-label="現在選択されている患者様ポータルの背景画像"
                          className="w-full h-36 mb-3 rounded-xl border border-sky-200 bg-cover bg-center"
                          style={{ backgroundImage: `url(${JSON.stringify(brandingForm.patientBackgroundUrl)})` }}
                        />
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        disabled={backgroundUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBackgroundUpload(file);
                          e.target.value = '';
                        }}
                        className="block w-full text-sm text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-sky-700 hover:file:bg-sky-200 disabled:opacity-60"
                      />
                      {backgroundUploading ? (
                        <p className="text-xs text-slate-400 mt-1">アップロード中...</p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1">jpeg/png/webp/gif、5MBまで。アップロード後に「保存する」を押してください。</p>
                      )}
                      {brandingForm.patientBackgroundUrl && !backgroundUploading && (
                        <button
                          type="button"
                          onClick={() => setBrandingForm((current) => ({ ...current, patientBackgroundUrl: '' }))}
                          className="text-xs text-red-600 hover:text-red-800 mt-2"
                        >
                          背景画像を削除して標準画像に戻す
                        </button>
                      )}
                    </div>
                  </div>
                  <Button theme="sky" onClick={handleSaveBranding} disabled={brandingSaving || backgroundUploading} className="mt-4">
                    {brandingSaving ? '保存中...' : '保存する'}
                  </Button>
                </Card>
              )}

              {clinic && (
                <Card theme="sky" className="p-5 sm:p-6 shadow-sm">
                  <p className="text-sm font-bold text-slate-700 mb-1">歯周病表示</p>
                  <p className="text-xs text-slate-400 mb-4">
                    オンにすると、患者様ポータルの「サプリメントの受け取り」画面に歯周病の診断結果が表示されます。オフにすると患者様には表示されなくなり、医院用ポータルでの新規診断の入力もできなくなります（登録済みの履歴は残ります）。
                  </p>
                  <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPeriodontalDiagnosis}
                      onChange={(e) => setShowPeriodontalDiagnosis(e.target.checked)}
                      className="w-4 h-4 accent-sky-500"
                    />
                    歯周病の診断結果を患者様ポータルに表示する
                  </label>
                  <Button theme="sky" onClick={handleSavePeriodontal} disabled={periodontalSaving} className="mt-4">
                    {periodontalSaving ? '保存中...' : '保存する'}
                  </Button>
                </Card>
              )}
              </div>

              {/* 右カラム：患者ポータルの表示設定 */}
              <div className="flex flex-col gap-5">
              {clinic && (
                <Card theme="sky" className="p-5 sm:p-6 shadow-sm">
                  <p className="text-sm font-bold text-slate-700 mb-1">患者ポータルの表示設定</p>
                  <p className="text-xs text-slate-400 mb-4">
                    患者様ポータルのメニューに表示する項目を選べます。チェックを外すと、患者様には表示されなくなります（少なくとも1つは表示のままにする必要があります）。
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {NAV_TOGGLE_ITEMS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={navForm[key]}
                          onChange={(e) => handleToggleNav(key, e.target.checked)}
                          className="w-4 h-4 accent-sky-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <Button theme="sky" onClick={handleSaveNav} disabled={navSaving} className="mt-4">
                    {navSaving ? '保存中...' : '保存する'}
                  </Button>
                </Card>
              )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
