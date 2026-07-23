'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AdminSidebar from '../../components/AdminSidebar';
import ClinicContactManager from '@/components/ClinicContactManager';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';

export default function AdminClinicContactsPage() {
  const { data: session, status } = useSession();
  const isClinic = session?.user?.role === 'clinic';
  const canManage = session?.user?.clinicRole === 'admin';
  return <div className="flex min-h-screen bg-sky-50"><AdminSidebar active="clinicContacts" /><div className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0"><header className="border-b border-sky-100 bg-white px-4 py-4 shadow-sm sm:px-6"><h1 className="text-xl font-bold text-slate-800">担当者管理一覧</h1><p className="mt-0.5 text-sm text-slate-600">医院スタッフ、個人ログイン、権限区分を管理します</p></header><main className="flex-1 p-5 sm:p-6">{status === 'loading' ? <LoadingState /> : isClinic ? <Card theme="sky" className="max-w-6xl p-5 shadow-sm sm:p-6">{!canManage && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">現在の権限は{session.user.clinicRole === 'viewer' ? '閲覧専用' : '一般'}です。担当者とログインの変更は医院管理者が行います。</div>}<ClinicContactManager customerCode={session.user.customerCode ?? undefined} manageLogins canEdit={canManage} /></Card> : <Card theme="sky" className="max-w-2xl p-5 shadow-sm"><p className="text-sm font-bold text-slate-700">この画面はクリニックログイン専用です</p><Link href="/bgj/customers" className="mt-4 inline-block rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white">BGJポータルの得意先一覧へ</Link></Card>}</main></div></div>;
}
