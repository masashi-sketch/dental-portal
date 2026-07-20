'use client';

import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import AdminSidebar from '../components/AdminSidebar';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import Card from '@/components/ui/Card';

const CommissionChart = nextDynamic(() => import('./CommissionChart'), {
  ssr: false,
  loading: () => <p className="text-slate-400 text-sm text-center py-16">グラフを読み込み中...</p>,
});

function MoneyOrDash({ value }: { value: number | null }) {
  return value === null ? <span className="text-slate-400">—</span> : <>¥{value.toLocaleString()}</>;
}

export default function CommissionPage() {
  const { overview, loading, error, reload } = useAdminOverview();
  const commerce = overview?.commerce;
  const current = commerce?.currentMonth;

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="commission" />
      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 shadow-sm">
          <div>
            <h1 className="text-slate-800 font-bold text-xl">コミッション管理</h1>
            <p className="text-slate-600 text-sm mt-0.5">内部注文の参考値と、決済確定値を分けて表示します</p>
          </div>
          <Link href="/admin/clinic-info/contract" className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50">取引条件を確認</Link>
        </header>

        <main className="flex-1 p-5 sm:p-6 flex flex-col gap-6 bg-sky-50">
          {error && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button type="button" onClick={() => void reload()} className="font-semibold underline">再読み込み</button>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
            <p className="font-bold">Shopify決済連携前の表示です</p>
            <p className="mt-1">参考注文金額は、患者ポータルで医院が登録した内部注文の商品価格 × 数量です。決済、割引、税・送料、返金を含まないため、売上・コミッションの確定値には使用しません。</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card theme="sky" className="p-5 shadow-sm">
              <p className="text-slate-500 text-xs font-semibold tracking-widest mb-4">内部注文（今月・参考）</p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <p className="text-slate-600 text-base">内部注文件数</p>
                  <p className="text-slate-800 text-xl font-bold">{loading || !current ? '—' : current.internalOrderCount}<span className="text-sm text-slate-400 font-normal ml-1">件</span></p>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <p className="text-slate-600 text-base">参考注文金額</p>
                  <p className="text-sky-700 text-2xl font-bold"><MoneyOrDash value={loading || !current ? null : current.internalOrderAmount} /></p>
                </div>
                <div className="flex items-center justify-between py-3">
                  <p className="text-slate-600 text-base">Shopify確定売上</p>
                  <p className="text-slate-800 text-xl font-bold"><MoneyOrDash value={current?.confirmedSales ?? null} /></p>
                </div>
              </div>
            </Card>

            <div className="bg-white border border-teal-100 rounded-2xl p-5 shadow-sm">
              <p className="text-slate-500 text-xs font-semibold tracking-widest mb-4">コミッション（今月）</p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <p className="text-slate-600 text-base">契約コミッション率</p>
                  <p className="text-slate-800 text-xl font-bold">{loading ? '—' : commerce?.commissionRate === null || commerce?.commissionRate === undefined ? '未設定' : `${commerce.commissionRate}%`}</p>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <p className="text-slate-600 text-base">確定コミッション</p>
                  <p className="text-teal-700 text-2xl font-bold"><MoneyOrDash value={current?.confirmedCommission ?? null} /></p>
                </div>
                <div className="py-3">
                  <p className="text-slate-600 text-base">確定条件</p>
                  <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Shopifyの決済・返金データ連携後に算出します</p>
                </div>
              </div>
            </div>
          </div>

          <Card theme="sky" className="p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
              <p className="text-slate-700 text-base font-bold">内部注文参考金額の月次推移（過去6ヶ月）</p>
              <p className="text-xs text-slate-400">キャンセル済み注文を除く</p>
            </div>
            {loading || !commerce ? <p className="py-16 text-center text-sm text-slate-400">読み込み中...</p> : <CommissionChart data={commerce.monthly} />}
          </Card>

          <Card theme="sky" className="overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-slate-700 text-base font-bold">商品別の内部注文内訳（今月・参考）</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['商品名', '数量', '参考注文金額', 'Shopify確定売上', '確定コミッション'].map((heading) => (
                      <th key={heading} className="text-left text-slate-600 font-semibold px-5 py-4 whitespace-nowrap">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">読み込み中...</td></tr>}
                  {!loading && commerce?.products.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">今月の内部注文はありません</td></tr>}
                  {!loading && commerce?.products.map((product) => (
                    <tr key={product.productName} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/80 transition-colors">
                      <td className="px-5 py-4 text-slate-800 font-semibold">{product.productName}</td>
                      <td className="px-5 py-4 text-slate-700 whitespace-nowrap">{product.quantity}<span className="text-slate-400 text-sm ml-1">点</span></td>
                      <td className="px-5 py-4 text-sky-700 font-mono font-semibold whitespace-nowrap">¥{product.internalOrderAmount.toLocaleString()}</td>
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap">—</td>
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
