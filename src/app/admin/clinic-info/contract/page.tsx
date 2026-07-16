'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '../../components/AdminSidebar';
import SalesRepAvatar from '@/components/SalesRepAvatar';
import { useClinicInfo } from '@/hooks/useClinicInfo';
import type { ClinicTerms } from '@/lib/supabase/types';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';

export default function AdminClinicContractPage() {
  const { isClinicRole, customerCode, clinic } = useClinicInfo();

  const [terms, setTerms] = useState<ClinicTerms | null>(null);
  const [termsLoading, setTermsLoading] = useState(true);

  useEffect(() => {
    if (!isClinicRole || !customerCode) return;
    let cancelled = false;
    fetch('/api/admin/clinic-terms')
      .then((res) => (res.ok ? res.json() : { terms: null }))
      .then((data) => { if (!cancelled) setTerms(data.terms ?? null); })
      .catch(() => { if (!cancelled) setTerms(null); })
      .finally(() => { if (!cancelled) setTermsLoading(false); });
    return () => { cancelled = true; };
  }, [customerCode, isClinicRole]);

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="clinicContract" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 shadow-sm">
          <h1 className="text-slate-800 font-bold text-xl">医院契約情報</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            {isClinicRole ? '医院の基本情報・取引条件を確認できます' : 'BGJ職員向けの得意先ごとの設定はBGJポータルから行います'}
          </p>
        </header>

        <main className="flex-1 p-5 sm:p-6">
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
              <Card theme="sky" className="p-5 sm:p-6 shadow-sm">
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
                  <LoadingState />
                )}
                <p className="text-xs text-slate-400 mt-4">この情報はBGJポータル側で管理されています。変更のご希望はバイオガイア担当者までお問い合わせください。</p>
              </Card>

              <Card theme="sky" className="p-5 sm:p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-700 mb-3">取引条件</p>
                {termsLoading ? (
                  <LoadingState />
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
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
