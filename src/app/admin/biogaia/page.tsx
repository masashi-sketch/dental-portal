'use client';

import { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

type ArticleStatus = '公開中' | '準備中' | '終了';
type ArticleCategory = '学術情報' | '製品情報' | '症例紹介' | 'お知らせ' | 'イベント';

type Article = {
  id: number;
  title: string;
  category: ArticleCategory;
  status: ArticleStatus;
  startDate: string;
  endDate: string;
  description: string;
  target: string;
};

const initialArticles: Article[] = [
  {
    id: 1,
    title: 'ロイテリ菌の口腔内フローラへの影響',
    category: '学術情報',
    status: '公開中',
    startDate: '2026-04-01',
    endDate: '2026-12-31',
    description: '最新の臨床研究に基づき、ロイテリ菌が口腔内の善玉菌バランスに与える影響をまとめた学術レポートです。医院スタッフの患者様への説明にご活用ください。',
    target: '医院スタッフ・患者様',
  },
  {
    id: 2,
    title: 'プロバイオティクス定期購入 新ラインナップ紹介',
    category: '製品情報',
    status: '公開中',
    startDate: '2026-05-01',
    endDate: '2026-08-31',
    description: '2026年春より追加した新商品3種のご紹介。それぞれの成分・効果・対象患者様の特徴を詳しく解説します。定期購入のご提案にお役立てください。',
    target: '医院スタッフ',
  },
  {
    id: 3,
    title: '口腔ケア×腸活 連携ケア症例レポート',
    category: '症例紹介',
    status: '公開中',
    startDate: '2026-03-15',
    endDate: '2026-09-30',
    description: '口腔ケアと腸内環境改善を組み合わせたトータルケアの症例をご紹介。患者様の変化と医院スタッフのコメントを交えた実践的な内容です。',
    target: '医院スタッフ',
  },
  {
    id: 4,
    title: 'バイオガイア・アカデミー夏季セミナー2026',
    category: 'イベント',
    status: '準備中',
    startDate: '2026-08-20',
    endDate: '2026-08-20',
    description: '歯科・小児科向けプロバイオティクス活用セミナーを開催予定。最新エビデンスの共有と実践的なワークショップを実施します。参加申込受付中。',
    target: '医院スタッフ',
  },
  {
    id: 5,
    title: '定期購入サポートガイド 改訂版',
    category: 'お知らせ',
    status: '準備中',
    startDate: '2026-07-01',
    endDate: '2026-12-31',
    description: '患者様への定期購入のご案内方法をまとめたガイドの改訂版を準備中です。より分かりやすい説明資料と提案トークスクリプトを収録予定。',
    target: '医院スタッフ',
  },
  {
    id: 6,
    title: '2025年度 口腔プロバイオティクス研究まとめ',
    category: '学術情報',
    status: '終了',
    startDate: '2025-12-01',
    endDate: '2026-03-31',
    description: '2025年に発表された口腔プロバイオティクス関連の主要論文をまとめたレビュー記事です。臨床での活用に向けた考察も収録しています。',
    target: '医院スタッフ・患者様',
  },
];

const statusStyles: Record<ArticleStatus, string> = {
  '公開中': 'text-teal-700 bg-teal-50 border-teal-200',
  '準備中': 'text-amber-700 bg-amber-50 border-amber-200',
  '終了':   'text-slate-500 bg-slate-100 border-slate-200',
};

const statusBorder: Record<ArticleStatus, string> = {
  '公開中': 'border-t-teal-400',
  '準備中': 'border-t-amber-400',
  '終了':   'border-t-slate-300',
};

const categoryStyles: Record<ArticleCategory, string> = {
  '学術情報':  'text-violet-700 bg-violet-50',
  '製品情報':  'text-blue-700 bg-blue-50',
  '症例紹介':  'text-teal-700 bg-teal-50',
  'お知らせ':  'text-sky-700 bg-sky-50',
  'イベント':  'text-orange-700 bg-orange-50',
};

function IconGrid() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
function IconList() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}

export default function BiogaiaPage() {
  const [articles] = useState<Article[]>(initialArticles);
  const [filterStatus, setFilterStatus] = useState<ArticleStatus | 'すべて'>('すべて');
  const [view, setView] = useState<'card' | 'list'>('list');

  const filtered = filterStatus === 'すべて' ? articles : articles.filter((a) => a.status === filterStatus);

  const counts = {
    すべて: articles.length,
    公開中: articles.filter((a) => a.status === '公開中').length,
    準備中: articles.filter((a) => a.status === '準備中').length,
    終了:   articles.filter((a) => a.status === '終了').length,
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="biogaia" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 shadow-sm">
          <div>
            <h1 className="text-slate-800 font-bold text-xl">バイオガイア通信</h1>
            <p className="text-slate-600 text-sm mt-0.5">学術情報・製品情報・症例紹介などの記事管理</p>
          </div>
          <div className="flex items-center gap-3">
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
            <Button theme="sky" disabled title="追加機能は準備中です">
              ＋ 追加
            </Button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-6 flex flex-col gap-5 bg-sky-50">

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            この一覧は掲載イメージのサンプル表示です。配信主体・保存先が確定するまで、追加・編集・削除は行えません。
          </div>

          {/* フィルタータブ */}
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
            <Card theme="sky" className="overflow-hidden shadow-sm">
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
                    {filtered.map((a) => (
                      <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/80 transition-colors">
                        <td className="px-5 py-4 text-slate-800 font-semibold max-w-[220px] truncate">{a.title}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${categoryStyles[a.category]}`}>{a.category}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${statusStyles[a.status]}`}>{a.status}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{a.startDate}</td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{a.endDate}</td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{a.target}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button disabled title="準備中です" className="text-sm text-slate-400 bg-slate-50 px-4 py-2 rounded-lg font-medium cursor-not-allowed">編集</button>
                            <button disabled title="準備中です" className="text-sm text-slate-400 bg-slate-50 px-4 py-2 rounded-lg font-medium cursor-not-allowed">削除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-slate-500 text-base py-12">該当する記事がありません</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* カードグリッド表示 */}
          {view === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((a) => (
                <Card key={a.id} theme="sky"
                  className={`border-t-4 ${statusBorder[a.status]} shadow-sm flex flex-col`}>
                  <div className="px-5 pt-5 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryStyles[a.category]}`}>{a.category}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyles[a.status]}`}>{a.status}</span>
                    </div>
                    <h3 className="text-slate-800 font-bold text-lg leading-snug">{a.title}</h3>
                  </div>
                  <div className="px-5 pb-3">
                    <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      {a.startDate} 〜 {a.endDate}
                    </div>
                  </div>
                  <div className="px-5 pb-3 flex-1">
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">{a.description}</p>
                  </div>
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      </svg>
                      <span className="font-medium">対象：</span>{a.target}
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
                    <button disabled title="準備中です" className="flex-1 text-sm text-slate-400 bg-slate-50 py-2 rounded-lg font-medium cursor-not-allowed">編集</button>
                    <button disabled title="準備中です"
                      className="flex-1 text-sm text-slate-400 bg-slate-50 py-2 rounded-lg font-medium cursor-not-allowed">削除</button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {filtered.length === 0 && view === 'card' && (
            <div className="text-center text-slate-500 text-base py-16">該当する記事がありません</div>
          )}
        </main>
      </div>
    </div>
  );
}
