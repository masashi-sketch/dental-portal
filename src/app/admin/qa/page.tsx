'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AdminSidebar from '../components/AdminSidebar';
import ClinicQaManager from '@/components/ClinicQaManager';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';

export default function AdminQaPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isClinicRole = session?.user?.role === 'clinic';
  const ready = sessionStatus !== 'loading';

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="clinicQa" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 shadow-sm">
          <h1 className="text-slate-800 font-bold text-xl">Q&amp;A</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            {isClinicRole ? '患者様ポータルの「Q&A」画面に表示する質問・回答を管理できます' : 'BGJ職員向けの得意先ごとの編集はBGJポータルから行います'}
          </p>
        </header>

        <main className="flex-1 p-5 sm:p-6">
          {!ready && <LoadingState />}

          {ready && !isClinicRole && (
            <Card theme="sky" className="p-5 sm:p-6 shadow-sm max-w-2xl">
              <p className="text-sm font-bold text-slate-700 mb-1">この画面はクリニックログイン専用です</p>
              <p className="text-slate-500 text-sm mb-4">
                得意先ごとのQ&amp;Aの編集は、BGJポータルの「得意先一覧」から行えます。
              </p>
              <Link
                href="/bgj/customers"
                className="inline-block bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                BGJポータルの得意先一覧へ
              </Link>
            </Card>
          )}

          {ready && isClinicRole && (
            <Card theme="sky" className="p-5 sm:p-6 shadow-sm max-w-3xl">
              <ClinicQaManager theme="sky" />
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
