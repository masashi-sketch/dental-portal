'use client';

import { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { useToast } from '@/hooks/useToast';

type CampaignStatus = '公開中' | '準備中' | '終了';
type CampaignCategory = '割引' | '新商品' | '季節' | 'キャンペーン' | 'イベント';

type Campaign = {
  id: number;
  title: string;
  category: CampaignCategory;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  description: string;
  target: string;
};

const initialCampaigns: Campaign[] = [
  {
    id: 1,
    title: '春の口腔ケアキャンペーン',
    category: '季節',
    status: '公開中',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    description: '春の健康習慣づくりに合わせ、口腔ケア商品をセットでお得にご提案。定期購入の新規申込で初月割引が適用されます。',
    target: '全患者様',
  },
  {
    id: 2,
    title: '定期購入はじめてキャンペーン',
    category: 'キャンペーン',
    status: '公開中',
    startDate: '2026-05-01',
    endDate: '2026-07-31',
    description: '定期購入を初めてご利用の患者様を対象に、初回お届け分を特別価格でご提供。継続的な健康サポートのきっかけに。',
    target: '定期購入未経験の患者様',
  },
  {
    id: 3,
    title: 'プロバイオティクス新商品モニター',
    category: '新商品',
    status: '準備中',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    description: '新しく取り扱いを開始するプロバイオティクス商品のモニターキャンペーン。使用感をご報告いただいた方に特典あり。',
    target: '希望患者様（先着20名）',
  },
  {
    id: 4,
    title: '夏の虫歯予防フェア',
    category: 'イベント',
    status: '準備中',
    startDate: '2026-07-15',
    endDate: '2026-09-15',
    description: '夏休み期間に合わせた虫歯予防キャンペーン。お子様向け商品のご案内と、ファミリー向けセット商品を期間限定で提供。',
    target: 'お子様をお持ちの患者様',
  },
  {
    id: 5,
    title: '年末感謝キャンペーン2025',
    category: '割引',
    status: '終了',
    startDate: '2025-12-01',
    endDate: '2025-12-31',
    description: '年末のご利用への感謝を込めて、全商品を対象に割引を実施。定期購入のお申込みで翌月の送料が無料になりました。',
    target: '全患者様',
  },
  {
    id: 6,
    title: '春の新生活応援パック',
    category: 'キャンペーン',
    status: '終了',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    description: '新生活のスタートを健康面からサポート。複数商品をまとめてお申込みの方へ特別割引と限定グッズのプレゼントを実施。',
    target: '新規・既存患者様',
  },
];

const statusStyles: Record<CampaignStatus, string> = {
  '公開中': 'text-teal-700 bg-teal-50 border-teal-200',
  '準備中': 'text-amber-700 bg-amber-50 border-amber-200',
  '終了':   'text-slate-500 bg-slate-100 border-slate-200',
};

const statusBorder: Record<CampaignStatus, string> = {
  '公開中': 'border-t-teal-400',
  '準備中': 'border-t-amber-400',
  '終了':   'border-t-slate-300',
};

const categoryStyles: Record<CampaignCategory, string> = {
  '割引':       'text-red-700 bg-red-50',
  '新商品':     'text-violet-700 bg-violet-50',
  '季節':       'text-sky-700 bg-sky-50',
  'キャンペーン': 'text-blue-700 bg-blue-50',
  'イベント':   'text-orange-700 bg-orange-50',
};

function IconGrid() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
function IconList() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}

export default function CampaignPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | 'すべて'>('すべて');
  const [view, setView] = useState<'card' | 'list'>('list');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast, showToast } = useToast();

  const handleDelete = (id: number) => {
    setCampaigns(campaigns.filter((c) => c.id !== id));
    setDeleteId(null);
    showToast('キャンペーンを削除しました');
  };

  const filtered = filterStatus === 'すべて' ? campaigns : campaigns.filter((c) => c.status === filterStatus);

  const counts = {
    すべて: campaigns.length,
    公開中: campaigns.filter((c) => c.status === '公開中').length,
    準備中: campaigns.filter((c) => c.status === '準備中').length,
    終了:   campaigns.filter((c) => c.status === '終了').length,
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="campaign" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 shadow-sm">
          <div>
            <h1 className="text-slate-800 font-bold text-xl">キャンペーン情報</h1>
            <p className="text-slate-600 text-sm mt-0.5">患者様向けキャンペーンの一覧・管理</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 表示切替 */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              <button onClick={() => setView('card')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  view === 'card' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <IconGrid />カード
              </button>
              <button onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  view === 'list' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <IconList />一覧
              </button>
            </div>
            <button className="bg-sky-500 hover:bg-sky-400 text-white text-base font-bold px-5 py-3 rounded-xl transition-colors cursor-pointer">
              ＋ 追加
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-6 flex flex-col gap-5 bg-sky-50">

          {toast && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
          )}

          {/* サマリーバッジ */}
          <div className="flex gap-2 flex-wrap">
            {(['すべて', '公開中', '準備中', '終了'] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-4 py-3 rounded-xl text-base font-medium transition-colors cursor-pointer ${
                  filterStatus === s ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300'
                }`}>
                {s} <span className="ml-1 text-sm opacity-70">({counts[s]})</span>
              </button>
            ))}
          </div>

          {/* 一覧（テーブル）表示 */}
          {view === 'list' && (
            <div className="bg-white border border-sky-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['タイトル', 'カテゴリ', 'ステータス', '開始日', '終了日', '対象', '操作'].map((h) => (
                        <th key={h} className="text-left text-slate-600 font-semibold px-5 py-4 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/80 transition-colors">
                        <td className="px-5 py-4 text-slate-800 font-semibold max-w-[200px] truncate">{c.title}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${categoryStyles[c.category]}`}>{c.category}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${statusStyles[c.status]}`}>{c.status}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{c.startDate}</td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{c.endDate}</td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{c.target}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button className="text-sm text-blue-700 hover:text-blue-600 bg-blue-50 px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium">編集</button>
                            <button onClick={() => setDeleteId(c.id)} className="text-sm text-red-600 hover:text-red-500 bg-red-50 px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium">削除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-slate-500 text-base py-12">該当するキャンペーンがありません</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* カードグリッド表示 */}
          {view === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((c) => (
              <div key={c.id}
                className={`bg-white border border-sky-100 border-t-4 ${statusBorder[c.status]} rounded-2xl shadow-sm flex flex-col`}>

                {/* カードヘッダー */}
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryStyles[c.category]}`}>
                      {c.category}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyles[c.status]}`}>
                      {c.status}
                    </span>
                  </div>
                  <h3 className="text-slate-800 font-bold text-lg leading-snug">{c.title}</h3>
                </div>

                {/* 期間 */}
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {c.startDate} 〜 {c.endDate}
                  </div>
                </div>

                {/* 説明 */}
                <div className="px-5 pb-3 flex-1">
                  <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">{c.description}</p>
                </div>

                {/* 対象 */}
                <div className="px-5 pb-4">
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    </svg>
                    <span className="font-medium">対象：</span>{c.target}
                  </div>
                </div>

                {/* アクション */}
                <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
                  <button className="flex-1 text-sm text-blue-700 hover:text-blue-600 bg-blue-50 py-2 rounded-lg transition-colors cursor-pointer font-medium">
                    編集
                  </button>
                  <button onClick={() => setDeleteId(c.id)}
                    className="flex-1 text-sm text-red-600 hover:text-red-500 bg-red-50 py-2 rounded-lg transition-colors cursor-pointer font-medium">
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center text-slate-500 text-base py-16">該当するキャンペーンがありません</div>
          )}
        </main>
      </div>

      {/* 削除確認モーダル */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-sky-100 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <p className="text-slate-800 font-bold text-lg mb-2">削除しますか？</p>
            <p className="text-slate-600 text-base mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-base font-medium transition-colors cursor-pointer">
                キャンセル
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-base transition-colors cursor-pointer">
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
