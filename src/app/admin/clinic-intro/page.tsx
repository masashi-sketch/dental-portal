'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AdminSidebar from '../components/AdminSidebar';
import ClinicStaffManager from '@/components/ClinicStaffManager';

const HOURS_FIELDS: { key: keyof HoursForm; label: string; placeholder: string }[] = [
  { key: 'clinicHoursWeekday', label: '平日の診療時間', placeholder: '例）9:00〜18:00' },
  { key: 'clinicHoursSaturday', label: '土曜日の診療時間', placeholder: '例）9:00〜13:00' },
  { key: 'clinicClosedDay', label: '休診日', placeholder: '例）水・日・祝日' },
  { key: 'clinicPhone', label: '電話番号', placeholder: '例）00-0000-0000' },
  { key: 'clinicAddress', label: '住所', placeholder: '例）〒000-0000 ◯◯県◯◯市◯◯' },
  { key: 'clinicNearestStation', label: '最寄駅', placeholder: '例）◯◯線「◯◯駅」徒歩◯分' },
  { key: 'clinicParking', label: '駐車場', placeholder: '例）専用駐車場3台あり' },
];

type HoursForm = {
  clinicHoursWeekday: string;
  clinicHoursSaturday: string;
  clinicClosedDay: string;
  clinicPhone: string;
  clinicAddress: string;
  clinicNearestStation: string;
  clinicParking: string;
};

const EMPTY_HOURS_FORM: HoursForm = {
  clinicHoursWeekday: '',
  clinicHoursSaturday: '',
  clinicClosedDay: '',
  clinicPhone: '',
  clinicAddress: '',
  clinicNearestStation: '',
  clinicParking: '',
};

export default function AdminClinicIntroPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isClinicRole = session?.user?.role === 'clinic';

  const [savedCode, setSavedCode] = useState('');
  const [toast, setToast] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [hoursForm, setHoursForm] = useState<HoursForm>(EMPTY_HOURS_FORM);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    if (sessionStatus === 'loading' || !isClinicRole) return;
    setSavedCode(session!.user.customerCode ?? '');
  }, [sessionStatus, isClinicRole, session]);

  useEffect(() => {
    if (!isClinicRole || !savedCode) return;
    fetch(`/api/admin/clinic-info?customerCode=${encodeURIComponent(savedCode)}`)
      .then((res) => (res.ok ? res.json() : { clinic: null }))
      .then((data) => {
        if (data.clinic) {
          setHoursForm({
            clinicHoursWeekday: data.clinic.clinic_hours_weekday ?? '',
            clinicHoursSaturday: data.clinic.clinic_hours_saturday ?? '',
            clinicClosedDay: data.clinic.clinic_closed_day ?? '',
            clinicPhone: data.clinic.clinic_phone ?? '',
            clinicAddress: data.clinic.clinic_address ?? '',
            clinicNearestStation: data.clinic.clinic_nearest_station ?? '',
            clinicParking: data.clinic.clinic_parking ?? '',
          });
        }
      })
      .finally(() => setLoaded(true));
  }, [isClinicRole, savedCode]);

  const handleSaveHours = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/clinic-info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hoursForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '保存に失敗しました');
      }
      showToast('診療時間・アクセス情報を保存しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="clinicIntro" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 shadow-sm">
          <h1 className="text-slate-800 font-bold text-xl">クリニック紹介</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            {isClinicRole ? '患者様ポータルの「クリニック紹介」画面に表示する内容を編集できます' : 'BGJ職員向けの得意先ごとの編集はBGJポータルから行います'}
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
                得意先ごとのクリニック紹介の編集は、BGJポータルの「得意先一覧」から行えます。
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
            <div className="flex flex-col gap-5 max-w-3xl">
              <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-700 mb-4">診療時間・アクセス</p>
                {!loaded ? (
                  <p className="text-slate-400 text-sm">読み込み中...</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {HOURS_FIELDS.map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
                          <input
                            type="text"
                            value={hoursForm[key]}
                            onChange={(e) => setHoursForm({ ...hoursForm, [key]: e.target.value })}
                            placeholder={placeholder}
                            className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleSaveHours}
                      disabled={saving}
                      className="mt-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-base font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer"
                    >
                      {saving ? '保存中...' : '保存する'}
                    </button>
                  </>
                )}
              </div>

              <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                <ClinicStaffManager theme="sky" />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
