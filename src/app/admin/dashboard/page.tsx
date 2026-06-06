'use client';

import Link from 'next/link';
import AdminSidebar from '../components/AdminSidebar';

function IconUsers() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function IconBell() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function IconRefresh() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}
function IconBag() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
function IconArrow() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
}

const stats = [
  { label: '登録患者数',   value: '5', unit: '名', icon: <IconUsers />,   color: 'text-blue-600',   bg: 'bg-blue-50',   href: '/admin/patients' },
  { label: 'お知らせ',     value: '3', unit: '件', icon: <IconBell />,    color: 'text-amber-500',  bg: 'bg-amber-50',  href: '/admin/news' },
  { label: '定期購入注文', value: '5', unit: '件', icon: <IconRefresh />, color: 'text-teal-600',   bg: 'bg-teal-50',   href: '/admin/orders' },
  { label: '登録商品数',   value: '8', unit: '品', icon: <IconBag />,     color: 'text-violet-600', bg: 'bg-violet-50', href: '/admin/products' },
];

const recentOrders = [
  { patient: '山田 太郎', product: 'オーラルプロバイオティクス', course: '6ヶ月', delivery: '自宅', status: '配送中', statusColor: 'text-teal-600 bg-teal-50' },
  { patient: '佐藤 花子', product: 'カルシウム＋ビタミンD',      course: '3ヶ月', delivery: '医院', status: '確認中', statusColor: 'text-amber-600 bg-amber-50' },
  { patient: '鈴木 一郎', product: '歯科専用 乳酸菌タブレット', course: '6ヶ月', delivery: '自宅', status: '配送中', statusColor: 'text-teal-600 bg-teal-50' },
  { patient: '伊藤 健一', product: 'オーラルプロバイオティクス', course: '6ヶ月', delivery: '医院', status: '配送中', statusColor: 'text-teal-600 bg-teal-50' },
];

const recentNews = [
  { date: '2026.06.01', tag: '重要',    text: '夏季休診のご案内（8/13〜8/15）',          tagColor: 'text-red-600 bg-red-50' },
  { date: '2026.05.20', tag: 'お知らせ', text: '定期購入サービスがリニューアルしました', tagColor: 'text-blue-600 bg-blue-50' },
  { date: '2026.05.10', tag: 'お知らせ', text: '新商品「薬用洗口液 500ml」を追加しました', tagColor: 'text-blue-600 bg-blue-50' },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="dashboard" />

      {/* メインエリア */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* トップバー */}
        <header className="bg-white border-b border-sky-100 px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-slate-800 font-bold text-lg">ダッシュボード</h1>
            <p className="text-slate-500 text-xs mt-0.5">テストデンタル歯科 / 管理ポータル</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm hidden sm:block">2026年6月5日</span>
            <Link
              href="/"
              target="_blank"
              className="text-xs bg-sky-50 text-sky-600 border border-sky-200 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors"
            >
              患者ポータルを確認
            </Link>
          </div>
        </header>

        {/* コンテンツ */}
        <main className="flex-1 p-5 sm:p-6 flex flex-col gap-6 bg-sky-50">

          {/* 統計カード */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s) => (
              <Link key={s.label} href={s.href}
                className="bg-white border border-sky-100 rounded-2xl p-4 hover:border-sky-200 hover:shadow-md transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color} mb-3`}>
                  {s.icon}
                </div>
                <p className="text-slate-500 text-xs mb-1">{s.label}</p>
                <p className="text-slate-800 text-2xl font-bold">{s.value}<span className="text-sm text-slate-400 font-normal ml-1">{s.unit}</span></p>
                <div className={`flex items-center gap-1 mt-2 text-xs ${s.color} group-hover:gap-1.5 transition-all`}>
                  詳細を見る <IconArrow />
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* 最近の注文 */}
            <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-800 font-bold text-sm">最近の定期購入注文</h2>
                <Link href="/admin/orders" className="text-sky-500 text-xs hover:underline">すべて見る →</Link>
              </div>
              <div className="flex flex-col gap-3">
                {recentOrders.map((o, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-slate-800 text-sm font-semibold">{o.patient}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{o.product}・{o.course}・{o.delivery}宛</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${o.statusColor}`}>{o.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* お知らせ一覧 */}
            <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-800 font-bold text-sm">公開中のお知らせ</h2>
                <Link href="/admin/news" className="text-sky-500 text-xs hover:underline">管理する →</Link>
              </div>
              <div className="flex flex-col gap-3">
                {recentNews.map((n, i) => (
                  <div key={i} className="py-2.5 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-400 text-[11px]">{n.date}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${n.tagColor}`}>{n.tag}</span>
                    </div>
                    <p className="text-slate-700 text-sm leading-snug">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* クイックリンク */}
          <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-slate-800 font-bold text-sm mb-4">クイックアクション</h2>
            <div className="flex flex-wrap gap-3">
              {[
                { label: '+ お知らせを追加', href: '/admin/news',     color: 'border-amber-300 text-amber-600 hover:bg-amber-50' },
                { label: '+ 患者IDを発行',   href: '/admin/patients', color: 'border-blue-300 text-blue-600 hover:bg-blue-50' },
                { label: '+ 商品を追加',     href: '/admin/products', color: 'border-violet-300 text-violet-600 hover:bg-violet-50' },
                { label: '注文一覧を確認',   href: '/admin/orders',   color: 'border-teal-300 text-teal-600 hover:bg-teal-50' },
              ].map((a) => (
                <Link key={a.label} href={a.href}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${a.color}`}
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
