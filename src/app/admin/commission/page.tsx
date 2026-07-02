'use client';

import { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type ClinicInfo = {
  patientType: string;
  treatmentType: string;
  partTimeDoctor: string;
  reception: string;
  dentalAssistant: string;
  nursery: string;
  counselingRoom: boolean;
  closedDay: string;
  fullTimeDoctor: string;
  hygienist: string;
  labTech: string;
  nurse: string;
  nutritionist: string;
  chairs: string;
  waitingRoom: string;
  mainReferrer: string;
};

const emptyForm: ClinicInfo = {
  patientType: '', treatmentType: '', partTimeDoctor: '', reception: '',
  dentalAssistant: '', nursery: '', counselingRoom: false, closedDay: '',
  fullTimeDoctor: '', hygienist: '', labTech: '', nurse: '',
  nutritionist: '', chairs: '', waitingRoom: '', mainReferrer: '',
};

const COMMISSION_RATE = 0.10;
const MONTHLY_TARGET = 3000;

const commissionTiers = [
  { label: '〜¥30,000',        rate: 10, min: 0,     max: 30000 },
  { label: '¥30,001〜¥50,000', rate: 12, min: 30001, max: 50000 },
  { label: '¥50,001〜',        rate: 15, min: 50001, max: Infinity },
];

// 定期購入データ
const orders = [
  { product: '定期購入商品 A', monthlyPrice: 3582, status: '配送中' },
  { product: '定期購入商品 B', monthlyPrice: 2356, status: '確認中' },
  { product: '定期購入商品 C', monthlyPrice: 1782, status: '配送中' },
  { product: '定期購入商品 D', monthlyPrice: 2831, status: '完了' },
  { product: '定期購入商品 A', monthlyPrice: 3582, status: '配送中' },
];

// 商品データ
const products = [
  { name: '定期購入商品 A', category: '定期購入',   price: 3980, salesCount: 2, status: '公開' },
  { name: '定期購入商品 B', category: '定期購入',   price: 2480, salesCount: 1, status: '公開' },
  { name: '定期購入商品 C', category: '定期購入',   price: 1980, salesCount: 1, status: '公開' },
  { name: '定期購入商品 D', category: '定期購入',   price: 2980, salesCount: 0, status: '公開' },
  { name: 'おすすめ商品 A', category: 'おすすめ商品', price: 3980, salesCount: 3, status: '公開' },
  { name: 'おすすめ商品 B', category: 'おすすめ商品', price: 1580, salesCount: 2, status: '公開' },
  { name: 'おすすめ商品 C', category: 'おすすめ商品', price: 4980, salesCount: 1, status: '公開' },
  { name: 'おすすめ商品 D', category: 'おすすめ商品', price: 1280, salesCount: 0, status: '非公開' },
];

const activeOrders = orders.filter((o) => o.status === '配送中' || o.status === '確認中');
const clinicOrderSales = activeOrders.reduce((s, o) => s + o.monthlyPrice, 0);
const activeProducts = products.filter((p) => p.status === '公開');
const clinicProductSales = activeProducts.reduce((s, p) => s + p.price * p.salesCount, 0);
const clinicTotalSales = clinicOrderSales + clinicProductSales;
const totalCommission = Math.floor(clinicTotalSales * COMMISSION_RATE);
const annualCommission = totalCommission * 12;
const achievementRate = Math.min(Math.round((totalCommission / MONTHLY_TARGET) * 100), 100);
const patientCount = 21;

const currentTierIndex = commissionTiers.findIndex(
  (t) => clinicTotalSales >= t.min && clinicTotalSales <= t.max
);
const nextTier = commissionTiers[currentTierIndex + 1] ?? null;
const toNextTier = nextTier ? nextTier.min - clinicTotalSales : 0;

// 月次グラフデータ
const monthlyData = [
  { month: '1月', 医院売上: 18200, コミッション: 1820, 患者来院数: 12 },
  { month: '2月', 医院売上: 21500, コミッション: 2150, 患者来院数: 15 },
  { month: '3月', 医院売上: 19800, コミッション: 1980, 患者来院数: 13 },
  { month: '4月', 医院売上: 24300, コミッション: 2430, 患者来院数: 18 },
  { month: '5月', 医院売上: 22100, コミッション: 2210, 患者来院数: 16 },
  { month: '6月', 医院売上: 27300, コミッション: 2730, 患者来院数: 21 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = (value: any, name: any) => {
  const num = Number(value);
  if (name === '患者来院数') return [`${num}名`, name];
  return [`¥${num.toLocaleString()}`, name];
};

export default function CommissionPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClinicInfo>(emptyForm);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleSave = () => {
    showToast('経営情報を保存しました');
    setShowForm(false);
  };

  const set = (key: keyof ClinicInfo, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inputCls = 'w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400';

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="commission" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 shadow-sm">
          <div>
            <h1 className="text-slate-800 font-bold text-xl">コミッション管理</h1>
            <p className="text-slate-600 text-sm mt-0.5">患者様の笑顔のために、ロイテリ菌を届けたい。</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-sky-500 hover:bg-sky-400 text-white text-base font-bold px-5 py-3 rounded-xl transition-colors cursor-pointer">
            ＋ 経営情報を追加
          </button>
        </header>

        <main className="flex-1 p-5 sm:p-6 flex flex-col gap-6 bg-sky-50">

          {/* 医院実績 ／ 弊社コミッション */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* 左：医院の実績 */}
            <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm">
              <p className="text-slate-500 text-xs font-semibold tracking-widest mb-4">医院の実績（今月）</p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <p className="text-slate-600 text-base">月間患者来院数</p>
                  <p className="text-slate-800 text-xl font-bold">{patientCount}<span className="text-sm text-slate-400 font-normal ml-1">名</span></p>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <p className="text-slate-600 text-base">定期購入売上</p>
                  <p className="text-slate-800 text-xl font-bold">¥{clinicOrderSales.toLocaleString()}<span className="text-sm text-slate-400 font-normal ml-1">/月</span></p>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <p className="text-slate-600 text-base">商品売上</p>
                  <p className="text-slate-800 text-xl font-bold">¥{clinicProductSales.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between py-3">
                  <p className="text-slate-700 text-base font-semibold">売上合計</p>
                  <p className="text-sky-700 text-2xl font-bold">¥{clinicTotalSales.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* 右：弊社コミッション */}
            <div className="bg-white border border-teal-100 rounded-2xl p-5 shadow-sm">
              <p className="text-slate-500 text-xs font-semibold tracking-widest mb-4">弊社のコミッション収益（今月）</p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <p className="text-slate-600 text-base">コミッション率</p>
                  <p className="text-slate-800 text-xl font-bold">10<span className="text-sm text-slate-400 font-normal ml-0.5">%</span></p>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <p className="text-slate-600 text-base">今月コミッション</p>
                  <p className="text-teal-700 text-2xl font-bold">¥{totalCommission.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <p className="text-slate-600 text-base">年間換算</p>
                  <p className="text-slate-800 text-xl font-bold">¥{annualCommission.toLocaleString()}</p>
                </div>
                {/* 月次目標プログレス */}
                <div className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-600 text-base">月次目標達成率</p>
                    <p className="text-teal-700 font-bold text-base">{achievementRate}%</p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className="bg-teal-500 h-3 rounded-full transition-all"
                      style={{ width: `${achievementRate}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-xs mt-1.5 text-right">目標 ¥{MONTHLY_TARGET.toLocaleString()}</p>
                  {achievementRate < 100 ? (
                    <p className="text-teal-600 text-sm font-semibold mt-2 text-center bg-teal-50 rounded-xl py-2">
                      あと <span className="font-bold">¥{(MONTHLY_TARGET - totalCommission).toLocaleString()}</span> で目標達成！
                    </p>
                  ) : (
                    <p className="text-teal-600 text-sm font-semibold mt-2 text-center bg-teal-50 rounded-xl py-2">
                      今月の目標を達成しました！
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 段階的コミッション率 */}
          <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <p className="text-slate-700 text-base font-bold">コミッション段階レート</p>
              {nextTier && (
                <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full font-semibold">
                  あと ¥{toNextTier.toLocaleString()} の売上で {nextTier.rate}% へランクアップ！
                </span>
              )}
              {!nextTier && (
                <span className="text-xs bg-teal-50 text-teal-600 border border-teal-200 px-3 py-1 rounded-full font-semibold">
                  最高ランク達成中！
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['月間売上', 'コミッション率', '今月の試算', 'ランク'].map((h) => (
                      <th key={h} className="text-left text-slate-500 font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {commissionTiers.map((tier, i) => {
                    const isCurrent = i === currentTierIndex;
                    const comm = Math.floor(clinicTotalSales * (tier.rate / 100));
                    return (
                      <tr key={tier.label} className={`border-b border-slate-100 last:border-0 transition-colors ${isCurrent ? 'bg-teal-50' : 'hover:bg-sky-50/80'}`}>
                        <td className={`px-4 py-3 font-medium whitespace-nowrap ${isCurrent ? 'text-teal-700' : 'text-slate-500'}`}>{tier.label}</td>
                        <td className={`px-4 py-3 font-bold text-xl whitespace-nowrap ${isCurrent ? 'text-teal-700' : 'text-slate-300'}`}>{tier.rate}%</td>
                        <td className={`px-4 py-3 font-mono font-semibold whitespace-nowrap ${isCurrent ? 'text-teal-700' : 'text-slate-300'}`}>
                          ¥{comm.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isCurrent ? (
                            <span className="text-xs font-bold text-white bg-teal-500 px-3 py-1 rounded-full">現在のランク</span>
                          ) : i < currentTierIndex ? (
                            <span className="text-xs font-semibold text-slate-400">達成済み</span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">次のランク</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 折れ線グラフ */}
          <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
            <p className="text-slate-700 text-base font-bold mb-5">月次推移グラフ（過去6ヶ月）</p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#64748b' }} />
                <YAxis yAxisId="money" tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#64748b' }} width={56} />
                <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} width={36} unit="名" />
                <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
                <Line yAxisId="money" type="monotone" dataKey="医院売上"   stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="money" type="monotone" dataKey="コミッション" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="count" type="monotone" dataKey="患者来院数"  stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 商品別コミッション内訳 */}
          <div className="bg-white border border-sky-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-slate-700 text-base font-bold">商品別コミッション内訳</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['商品名', 'カテゴリ', '単価', '販売数', '売上合計', 'コミッション率', 'コミッション'].map((h) => (
                      <th key={h} className="text-left text-slate-600 font-semibold px-5 py-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.filter((p) => p.status === '公開').map((p) => {
                    const sales = p.price * p.salesCount;
                    const comm  = Math.floor(sales * COMMISSION_RATE);
                    return (
                      <tr key={p.name} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/80 transition-colors">
                        <td className="px-5 py-4 text-slate-800 font-semibold">{p.name}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                            p.category === '定期購入' ? 'text-indigo-700 bg-indigo-50' : 'text-amber-700 bg-amber-50'
                          }`}>{p.category}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-700 font-mono whitespace-nowrap">¥{p.price.toLocaleString()}</td>
                        <td className="px-5 py-4 text-slate-700 whitespace-nowrap">{p.salesCount}<span className="text-slate-400 text-sm ml-1">件</span></td>
                        <td className="px-5 py-4 text-slate-800 font-mono font-semibold whitespace-nowrap">¥{sales.toLocaleString()}</td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">10%</td>
                        <td className="px-5 py-4 text-teal-700 font-mono font-semibold whitespace-nowrap">
                          {comm > 0 ? `¥${comm.toLocaleString()}` : <span className="text-slate-400 font-normal">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-teal-50 border-t-2 border-teal-100">
                    <td colSpan={4} className="px-5 py-4 text-slate-700 font-bold">合計</td>
                    <td className="px-5 py-4 text-slate-800 font-mono font-bold">¥{clinicProductSales.toLocaleString()}</td>
                    <td className="px-5 py-4"></td>
                    <td className="px-5 py-4 text-teal-700 font-mono font-bold">¥{Math.floor(clinicProductSales * COMMISSION_RATE).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* トースト通知 */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}

      {/* 経営情報入力モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-sky-100 rounded-2xl w-full max-w-2xl shadow-2xl my-6">

            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-slate-800 font-bold text-xl">経営情報を追加</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-6">

              {/* 医院情報セクション */}
              <div>
                <p className="text-slate-500 text-xs font-semibold tracking-widest mb-4 pb-2 border-b border-slate-100">医院情報</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">患者層分類</label>
                    <input value={form.patientType} onChange={(e) => set('patientType', e.target.value)}
                      placeholder="例）高齢者・ファミリー" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">常勤医師数</label>
                    <input type="number" value={form.fullTimeDoctor} onChange={(e) => set('fullTimeDoctor', e.target.value)}
                      placeholder="例）3" className={inputCls} />
                  </div>

                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">診療区分</label>
                    <input value={form.treatmentType} onChange={(e) => set('treatmentType', e.target.value)}
                      placeholder="例）一般・小児・矯正" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">歯科衛生士数</label>
                    <input type="number" value={form.hygienist} onChange={(e) => set('hygienist', e.target.value)}
                      placeholder="例）5" className={inputCls} />
                  </div>

                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">非常勤医師数</label>
                    <input type="number" value={form.partTimeDoctor} onChange={(e) => set('partTimeDoctor', e.target.value)}
                      placeholder="例）1" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">歯科技工士数</label>
                    <input type="number" value={form.labTech} onChange={(e) => set('labTech', e.target.value)}
                      placeholder="例）2" className={inputCls} />
                  </div>

                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">受付・TC数</label>
                    <input type="number" value={form.reception} onChange={(e) => set('reception', e.target.value)}
                      placeholder="例）3" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">看護師数</label>
                    <input type="number" value={form.nurse} onChange={(e) => set('nurse', e.target.value)}
                      placeholder="例）1" className={inputCls} />
                  </div>

                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">歯科助手数</label>
                    <input type="number" value={form.dentalAssistant} onChange={(e) => set('dentalAssistant', e.target.value)}
                      placeholder="例）4" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">管理栄養士数</label>
                    <input type="number" value={form.nutritionist} onChange={(e) => set('nutritionist', e.target.value)}
                      placeholder="例）1" className={inputCls} />
                  </div>

                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">保育士数</label>
                    <input type="number" value={form.nursery} onChange={(e) => set('nursery', e.target.value)}
                      placeholder="例）1" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">チェア数</label>
                    <input type="number" value={form.chairs} onChange={(e) => set('chairs', e.target.value)}
                      placeholder="例）8" className={inputCls} />
                  </div>

                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">カウンセリングルーム</label>
                    <button
                      type="button"
                      onClick={() => set('counselingRoom', !form.counselingRoom)}
                      className={`w-full py-3 rounded-xl border text-base font-medium transition-colors cursor-pointer ${
                        form.counselingRoom
                          ? 'bg-teal-50 border-teal-300 text-teal-700'
                          : 'bg-sky-50 border-sky-200 text-slate-500'
                      }`}
                    >
                      {form.counselingRoom ? '✓ あり' : 'なし'}
                    </button>
                  </div>
                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">待合室規模（人数）</label>
                    <input type="number" value={form.waitingRoom} onChange={(e) => set('waitingRoom', e.target.value)}
                      placeholder="例）15" className={inputCls} />
                  </div>

                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">休診日</label>
                    <input value={form.closedDay} onChange={(e) => set('closedDay', e.target.value)}
                      placeholder="例）水・日・祝日" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-slate-700 text-base font-medium mb-1.5 block">主な推薦者</label>
                    <input value={form.mainReferrer} onChange={(e) => set('mainReferrer', e.target.value)}
                      placeholder="例）山本権兵衛" className={inputCls} />
                  </div>

                </div>
              </div>
            </div>

            {/* フッターボタン */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-base font-medium transition-colors cursor-pointer">
                キャンセル
              </button>
              <button onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-base transition-colors cursor-pointer">
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
