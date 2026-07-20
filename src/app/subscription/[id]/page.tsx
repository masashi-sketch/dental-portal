'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import BottomNav from '../../components/BottomNav';
import PatientSidebarNav, { IconLogout } from '@/components/PatientSidebarNav';
import ProductVisual from '@/components/ProductVisual';
import { usePatientClinicBranding } from '@/hooks/usePatientClinicBranding';
import { usePatientProducts } from '@/hooks/usePatientProducts';

function IconBell() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function IconUser() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconArrowLeft() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
}
function IconCheck() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>;
}

type Period = '6ヶ月' | '3ヶ月';
type Delivery = '自宅' | '医院';

export default function SubscriptionOrderPage() {
  const params = useParams();
  const id = String(params.id);
  const { products, loaded: productsLoaded, error: productsError } = usePatientProducts();
  const product = products.find((p) => p.id === id && p.subscription_available);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [period, setPeriod] = useState<Period | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const { clinicName, navVisibility } = usePatientClinicBranding();

  if (!productsLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-gray-400">商品情報を読み込んでいます…</div>;
  }

  if (!product || productsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{productsError ?? '商品が見つかりませんでした。'}</p>
          <Link href="/subscription" className="text-[#2563EB] hover:underline text-sm">← 定期購入トップへ</Link>
        </div>
      </div>
    );
  }

  const discountRate = period === '6ヶ月' ? 0.1 : period === '3ヶ月' ? 0.05 : 0;
  const months = period === '6ヶ月' ? 6 : 3;
  const monthlyPrice = Math.floor(product.price * (1 - discountRate));
  const totalPrice = monthlyPrice * months;

  const steps = [
    { num: 1, label: '期間選択' },
    { num: 2, label: 'お届け先' },
    { num: 3, label: '確認' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 md:pb-0">

      {/* アナウンスバー */}
      <div className="bg-[#F0F7FF] text-[#2563EB] text-xs text-center py-2 px-4">
        医師監修のもと提供される患者様専用のポータルサービスです
      </div>

      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-gray-900 font-bold text-lg tracking-tight">{clinicName ?? 'デンタルポータル'}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <button className="hover:text-[#2563EB] transition-colors"><IconBell /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
          </div>
        </div>
      </header>

      {/* ボトムナビ（モバイル） */}
      <BottomNav active="subscription" navVisibility={navVisibility} />

      {/* ボディ */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 gap-6 sm:gap-8">

        {/* サイドバー */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <PatientSidebarNav active="subscription" navVisibility={navVisibility}>
              <div className="my-2 h-px bg-gray-100" />
              <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                <span className="text-gray-400"><IconLogout /></span>ログアウト
              </Link>
            </PatientSidebarNav>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col gap-5 min-w-0">

          {/* パンくず */}
          {(
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Link href="/subscription" className="flex items-center gap-1 hover:text-[#2563EB] transition-colors">
                <IconArrowLeft />定期購入
              </Link>
              <span>/</span>
              <span className="text-gray-500 truncate">{product.name}</span>
            </div>
          )}

          {/* 商品サマリーカード */}
          {(
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <ProductVisual type={product.image_type} className="w-20 h-20 shrink-0 rounded-xl flex items-center justify-center" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">{product.description}</p>
                <p className="font-bold text-gray-900 text-sm leading-snug break-all">{product.name}</p>
                <p className="text-xs text-gray-400 mt-1 break-all">{product.volume}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">月額（通常）</p>
                <p className="text-lg font-bold text-gray-900">¥{product.price.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* ステップインジケーター */}
          {(
            <div className="flex items-center gap-0">
              {steps.map((s, i) => (
                <div key={s.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      step > s.num ? 'bg-[#4f46e5] text-white' :
                      step === s.num ? 'bg-[#4f46e5] text-white ring-4 ring-indigo-100' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {step > s.num ? <IconCheck /> : s.num}
                    </div>
                    <p className={`text-[11px] mt-1 font-semibold transition-colors ${
                      step >= s.num ? 'text-[#4f46e5]' : 'text-gray-300'
                    }`}>{s.label}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 mb-4 transition-colors ${step > s.num ? 'bg-[#4f46e5]' : 'bg-gray-100'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ──── STEP 1: 期間選択 ──── */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">定期購入の料金シミュレーション</h2>
              <p className="text-sm text-gray-400 mb-6">表示価格は参考です。正式な料金プランはShopify連携時に確定します。</p>

              <div className="flex flex-col gap-4">
                {/* 6ヶ月コース */}
                <button
                  onClick={() => setPeriod('6ヶ月')}
                  className={`relative w-full text-left border-2 rounded-2xl p-5 transition-all ${
                    period === '6ヶ月'
                      ? 'border-[#4f46e5] bg-indigo-50'
                      : 'border-gray-100 hover:border-indigo-200 bg-white'
                  }`}
                >
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    一番お得 10%OFF
                  </div>
                  <div className="flex items-start gap-4">
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                      period === '6ヶ月' ? 'border-[#4f46e5] bg-[#4f46e5]' : 'border-gray-300'
                    }`}>
                      {period === '6ヶ月' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-base">6ヶ月コース</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-bold text-[#4f46e5]">
                          ¥{Math.floor(product.price * 0.9).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400">/月</span>
                        <span className="text-sm text-gray-300 line-through">¥{product.price.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        合計 <span className="font-semibold text-gray-900">¥{(Math.floor(product.price * 0.9) * 6).toLocaleString()}</span>（6ヶ月分・税込）
                      </p>
                      <p className="text-xs text-indigo-600 mt-2 font-medium">
                        ¥{(product.price * 6 - Math.floor(product.price * 0.9) * 6).toLocaleString()} お得！
                      </p>
                    </div>
                  </div>
                </button>

                {/* 3ヶ月コース */}
                <button
                  onClick={() => setPeriod('3ヶ月')}
                  className={`w-full text-left border-2 rounded-2xl p-5 transition-all ${
                    period === '3ヶ月'
                      ? 'border-[#4f46e5] bg-indigo-50'
                      : 'border-gray-100 hover:border-indigo-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                      period === '3ヶ月' ? 'border-[#4f46e5] bg-[#4f46e5]' : 'border-gray-300'
                    }`}>
                      {period === '3ヶ月' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-base">3ヶ月コース</p>
                        <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full">5%OFF</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-bold text-emerald-600">
                          ¥{Math.floor(product.price * 0.95).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400">/月</span>
                        <span className="text-sm text-gray-300 line-through">¥{product.price.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        合計 <span className="font-semibold text-gray-900">¥{(Math.floor(product.price * 0.95) * 3).toLocaleString()}</span>（3ヶ月分・税込）
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => { if (period) setStep(2); }}
                disabled={!period}
                className={`w-full mt-6 py-4 rounded-xl font-bold text-base transition-all ${
                  period
                    ? 'bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white hover:opacity-90 shadow-sm active:scale-95'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                次へ：お届け先を選ぶ →
              </button>
            </div>
          )}

          {/* ──── STEP 2: お届け先選択 ──── */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">お届け先を選択</h2>
              <p className="text-sm text-gray-400 mb-6">毎月のお届け先を指定してください</p>

              <div className="flex flex-col gap-4">
                {/* 自宅 */}
                <button
                  disabled
                  className="w-full text-left border-2 rounded-2xl p-5 border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      delivery === '自宅' ? 'border-[#4f46e5] bg-[#4f46e5]' : 'border-gray-300'
                    }`}>
                      {delivery === '自宅' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        </div>
                        <p className="font-bold text-gray-900 text-base">ご自宅へお届け</p>
                      </div>
                      <p className="text-sm text-gray-500 ml-[52px]">Shopify Customer Accountの住所連携後に利用できます。</p>
                    </div>
                  </div>
                </button>

                {/* 医院 */}
                <button
                  onClick={() => setDelivery('医院')}
                  className={`w-full text-left border-2 rounded-2xl p-5 transition-all ${
                    delivery === '医院'
                      ? 'border-[#4f46e5] bg-indigo-50'
                      : 'border-gray-100 hover:border-indigo-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      delivery === '医院' ? 'border-[#4f46e5] bg-[#4f46e5]' : 'border-gray-300'
                    }`}>
                      {delivery === '医院' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M3 9h6" /><path d="M12 7h6M12 12h6M12 17h6" />
                          </svg>
                        </div>
                        <p className="font-bold text-gray-900 text-base">医院で受け取り</p>
                      </div>
                      <p className="text-sm text-gray-500">次回ご来院時に受け取れます。送料が不要です。</p>
                      <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-600">
                        <p className="font-semibold mb-1">受け取り先</p>
                        <p>{clinicName ?? 'デンタルポータル'}</p>
                      </div>
                      <span className="inline-block mt-2 text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-medium">
                        送料無料
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  <IconArrowLeft />戻る
                </button>
                <button
                  onClick={() => { if (delivery) setStep(3); }}
                  disabled={!delivery}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-base transition-all ${
                    delivery
                      ? 'bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white hover:opacity-90 shadow-sm active:scale-95'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  次へ：内容を確認する →
                </button>
              </div>
            </div>
          )}

          {/* ──── STEP 3: 確認 ──── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5">申込内容の確認</h2>

                {/* 商品 */}
                <div className="flex items-center gap-4 pb-5 border-b border-gray-50">
                  <ProductVisual type={product.image_type} className="w-20 h-20 shrink-0 rounded-xl flex items-center justify-center" />
                  <div>
                    <p className="font-bold text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{product.volume}</p>
                  </div>
                </div>

                {/* 詳細 */}
                <div className="divide-y divide-gray-50 mt-1">
                  {[
                    { label: 'コース',       value: `${period}コース` },
                    { label: 'お届け先',     value: delivery === '自宅' ? 'ご自宅（登録住所）' : `医院（${clinicName ?? 'デンタルポータル'}）` },
                    { label: '割引',         value: period === '6ヶ月' ? '10% OFF' : '5% OFF' },
                    { label: '月額（税込）', value: `¥${monthlyPrice.toLocaleString()}` },
                    { label: '合計（税込）', value: `¥${totalPrice.toLocaleString()}（${months}ヶ月分）` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-3.5 text-sm">
                      <span className="text-gray-400">{label}</span>
                      <span className={`font-semibold ${label === '合計（税込）' ? 'text-lg text-[#4f46e5]' : 'text-gray-800'}`}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700 leading-relaxed">
                  これは申込前の参考シミュレーションです。現時点では契約・決済・注文は作成されません。
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  <IconArrowLeft />戻る
                </button>
                <button
                  disabled
                  className="flex-1 py-4 rounded-xl font-bold text-base bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Shopify接続後にお申し込みいただけます
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 mt-auto hidden md:block">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center gap-4 text-xs sm:text-sm md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#2563EB] rounded-md flex items-center justify-center">
              <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </div>
            <span className="text-white font-semibold">{clinicName ?? 'デンタルポータル'}</span>
          </div>
          <div className="text-gray-500 text-xs">© 2026 {clinicName ?? 'デンタルポータル'}. All Rights Reserved.</div>
        </div>
      </footer>

    </div>
  );
}
