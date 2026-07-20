'use client';

import Link from 'next/link';
import AdminSidebar from '../components/AdminSidebar';
import { useActiveClinic } from '@/hooks/useActiveClinic';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import { ORDER_STATUS_LABEL } from '@/lib/orders';
import type { PatientOrderStatus } from '@/lib/supabase/types';
import Card from '@/components/ui/Card';

function IconUsers() {
  return <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function IconBell() {
  return <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function IconRefresh() {
  return <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}
function IconBag() {
  return <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
function IconArrow() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
}

const statusColors: Record<PatientOrderStatus, string> = {
  received: 'text-amber-700 bg-amber-50',
  preparing: 'text-blue-700 bg-blue-50',
  ready: 'text-indigo-700 bg-indigo-50',
  shipped: 'text-teal-700 bg-teal-50',
  completed: 'text-slate-600 bg-slate-100',
  canceled: 'text-red-700 bg-red-50',
};

const tagColors = {
  '重要': 'text-red-700 bg-red-50',
  'お知らせ': 'text-blue-700 bg-blue-50',
  'キャンペーン': 'text-amber-700 bg-amber-50',
} as const;

export default function AdminDashboard() {
  const { clinicName } = useActiveClinic();
  const { overview, loading, error, reload } = useAdminOverview();
  const counts = overview?.counts;
  const stats = [
    { label: '有効患者数', value: counts?.patientCount, unit: '名', icon: <IconUsers />, color: 'text-blue-600', bg: 'bg-blue-50', href: '/admin/patients' },
    { label: '公開中のお知らせ', value: counts?.publishedAnnouncementCount, unit: '件', icon: <IconBell />, color: 'text-amber-500', bg: 'bg-amber-50', href: '/admin/news' },
    { label: '対応中の患者注文', value: counts?.activeOrderCount, unit: '件', icon: <IconRefresh />, color: 'text-teal-600', bg: 'bg-teal-50', href: '/admin/orders' },
    { label: '表示中の商品', value: counts?.visibleProductCount, unit: '品', icon: <IconBag />, color: 'text-violet-600', bg: 'bg-violet-50', href: '/admin/products' },
  ];
  const generatedDate = overview
    ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long', timeZone: 'Asia/Tokyo' }).format(new Date(overview.generatedAt))
    : null;

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="dashboard" />
      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 shadow-sm">
          <div>
            <h1 className="text-slate-800 font-bold text-xl">ダッシュボード</h1>
            <p className="text-slate-600 text-sm mt-0.5">{clinicName ?? '医院'} / 管理ポータル</p>
          </div>
          <div className="flex items-center gap-3">
            {generatedDate && <span className="text-slate-600 text-sm hidden sm:block">{generatedDate} 更新</span>}
            <Link href="/" target="_blank" className="text-sm bg-sky-50 text-sky-700 border border-sky-200 px-4 py-2 rounded-lg hover:bg-sky-100 transition-colors font-medium">
              患者ポータルを確認
            </Link>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-6 flex flex-col gap-6 bg-sky-50">
          {error && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button type="button" onClick={() => void reload()} className="font-semibold underline">再読み込み</button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Link key={stat.label} href={stat.href} className="bg-white border border-sky-100 rounded-2xl p-5 hover:border-sky-200 hover:shadow-md transition-all group">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-3`}>{stat.icon}</div>
                <p className="text-slate-600 text-sm mb-1 font-medium">{stat.label}</p>
                <p className="text-slate-800 text-3xl font-bold">
                  {loading || stat.value === undefined ? '—' : stat.value}
                  <span className="text-base text-slate-500 font-normal ml-1">{stat.unit}</span>
                </p>
                <div className={`flex items-center gap-1 mt-2 text-sm ${stat.color} group-hover:gap-1.5 transition-all`}>詳細を見る <IconArrow /></div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card theme="sky" className="p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-800 font-bold text-base">最近の患者注文</h2>
                <Link href="/admin/orders" className="text-sky-600 text-sm font-medium hover:underline">すべて見る →</Link>
              </div>
              <div className="flex flex-col gap-3">
                {loading && <p className="py-8 text-center text-sm text-slate-400">読み込み中...</p>}
                {!loading && overview?.recentOrders.length === 0 && <p className="py-8 text-center text-sm text-slate-400">注文はまだありません</p>}
                {!loading && overview?.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
                    <div className="min-w-0">
                      <p className="text-slate-800 text-base font-semibold">{order.patientName}</p>
                      <p className="text-slate-600 text-sm mt-0.5 truncate">{order.productSummary}・{order.fulfillmentMethod === 'pickup' ? '医院受け取り' : '自宅配送'}</p>
                    </div>
                    <span className={`shrink-0 text-sm px-3 py-1 rounded-full font-semibold ${statusColors[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card theme="sky" className="p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-800 font-bold text-base">公開中のお知らせ</h2>
                <Link href="/admin/news" className="text-sky-600 text-sm font-medium hover:underline">管理する →</Link>
              </div>
              <div className="flex flex-col gap-3">
                {loading && <p className="py-8 text-center text-sm text-slate-400">読み込み中...</p>}
                {!loading && overview?.recentAnnouncements.length === 0 && <p className="py-8 text-center text-sm text-slate-400">公開中のお知らせはありません</p>}
                {!loading && overview?.recentAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-500 text-xs">{new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo' }).format(new Date(`${announcement.announcementDate}T00:00:00+09:00`))}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tagColors[announcement.tag]}`}>{announcement.tag}</span>
                    </div>
                    <p className="text-slate-700 text-base leading-snug break-words">{announcement.text}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card theme="sky" className="p-5 shadow-sm">
            <h2 className="text-slate-800 font-bold text-base mb-4">クイックアクション</h2>
            <div className="flex flex-wrap gap-3">
              {[
                { label: '+ お知らせを追加', href: '/admin/news', color: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
                { label: '+ 患者IDを発行', href: '/admin/patients', color: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
                { label: '商品の表示を管理', href: '/admin/products', color: 'border-violet-300 text-violet-700 hover:bg-violet-50' },
                { label: '注文一覧を確認', href: '/admin/orders', color: 'border-teal-300 text-teal-700 hover:bg-teal-50' },
              ].map((action) => (
                <Link key={action.label} href={action.href} className={`px-5 py-3 rounded-xl border text-base font-semibold transition-colors ${action.color}`}>{action.label}</Link>
              ))}
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
