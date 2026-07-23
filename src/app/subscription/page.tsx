'use client';

import Link from 'next/link';
import BottomNav from '../components/BottomNav';
import PatientSidebarNav, { IconLogout } from '@/components/PatientSidebarNav';
import PreviewModeBanner from '@/components/PreviewModeBanner';
import SalesRepAvatar from '@/components/SalesRepAvatar';
import ProductVisual from '@/components/ProductVisual';
import { usePatientClinicBranding } from '@/hooks/usePatientClinicBranding';
import { usePrimaryDoctor } from '@/hooks/usePrimaryDoctor';
import { usePatientProducts } from '@/hooks/usePatientProducts';
import { PRODUCT_BADGE_CLASS } from '@/lib/productDisplay';
import SubscriptionRequestsPanel from './SubscriptionRequestsPanel';

function IconBell() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function IconUser() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconCheck() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>;
}
function IconArrowRight() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
}
function IconShield() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function IconTruck() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>;
}
function IconStar() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}

const benefits = [
  { icon: <IconTruck />, title: '毎月自動お届け', desc: '申込後は手続き不要。毎月定期的にお届けします。' },
  { icon: <IconShield />, title: '品質保証', desc: '歯科医師・歯科衛生士監修の安心商品のみをご提供。' },
  { icon: <IconStar />, title: '継続サポート価格', desc: '医院が設定した3ヶ月・6ヶ月コースの価格でご案内します。' },
  { icon: <IconCheck />, title: '申込状況を確認', desc: '受付・確認状況をポータルで確認できます。受付中は取消も可能です。' },
];

export default function SubscriptionPage() {
  const { clinicName, navVisibility } = usePatientClinicBranding();
  const { doctor } = usePrimaryDoctor();
  const { products, loaded: productsLoaded, error: productsError } = usePatientProducts();
  const subscriptionProducts = products.filter((product) => product.subscription_available);
  const doctorLabel = doctor ? `${doctor.name}先生` : `${clinicName ?? 'デンタルポータル'} 院長`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 md:pb-0">

      <PreviewModeBanner />

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
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          <SubscriptionRequestsPanel />

          {/* ヒーローバナー */}
          <div className="relative bg-gradient-to-r from-[#4f46e5] to-[#818cf8] rounded-2xl p-6 sm:p-8 text-white overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10">
              <svg viewBox="0 0 100 200" fill="white" className="w-full h-full">
                <ellipse cx="50" cy="100" rx="30" ry="50" />
                <ellipse cx="50" cy="60" rx="30" ry="20" />
              </svg>
            </div>
            <div className="relative z-10">
              <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                定期購入サービス
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold leading-snug mb-2">
                歯科医院発の<br />オーラルケアサプリ
              </h1>
              <p className="text-indigo-100 text-sm leading-relaxed mb-4 max-w-md">
                歯科医師・歯科衛生士が厳選した口腔健康サポートサプリを、毎月ご自宅または医院へお届け。定期購入で特別価格でご利用いただけます。
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full">継続サポート価格あり</span>
                <span className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full">いつでも解約OK</span>
              </div>
            </div>
          </div>

          {/* 先生が継続をおすすめする理由 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
            {doctor ? (
              <SalesRepAvatar name={doctor.name} photoUrl={doctor.photo_url} size={48} className="!rounded-full" />
            ) : (
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center shrink-0 text-indigo-500">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 mb-1">{doctorLabel}が継続をおすすめする理由</p>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                口腔内のケアは、一度で終わるものではなく続けることで効果が現れます。毎日の診療で拝見していても、続けられた患者様ほど良い状態を保てています。無理なく続けられるよう、続けやすい価格でご案内しています。
              </p>
            </div>
          </div>

          {/* 特徴4項目 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {benefits.map((b) => (
              <div key={b.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  {b.icon}
                </div>
                <p className="text-sm font-bold text-gray-800">{b.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* 商品一覧 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold text-gray-900">定期購入 対象商品</p>
              <span className="text-xs text-gray-400">{subscriptionProducts.length}商品</span>
            </div>
            {!productsLoaded && <p className="py-10 text-center text-sm text-gray-400">商品情報を読み込んでいます…</p>}
            {productsError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{productsError}</p>}
            {productsLoaded && !productsError && subscriptionProducts.length === 0 && (
              <p className="rounded-xl bg-white px-4 py-10 text-center text-sm text-gray-500">現在、定期購入対象の商品はありません。</p>
            )}
            <div className="flex flex-col gap-4">
              {subscriptionProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* 画像 */}
                    <div className="sm:w-56 sm:shrink-0 p-4">
                      <div className="relative">
                        <ProductVisual type={product.image_type} imageUrl={product.image_url} className="w-full h-48 flex items-center justify-center rounded-2xl" />
                        {product.badge && <span className={`absolute top-2.5 left-2.5 text-xs font-semibold px-2.5 py-1 rounded-full ${PRODUCT_BADGE_CLASS[product.badge_color ?? 'slate']}`}>
                          {product.badge}
                        </span>}
                      </div>
                    </div>

                    {/* 商品情報 */}
                    <div className="flex-1 px-4 pb-5 sm:py-5 sm:pr-5 sm:pl-0">
                      <h2 className="text-lg font-bold text-gray-900 mb-1">{product.name}</h2>
                      <p className="text-xs text-gray-400 mb-3">{product.description}</p>

                      {/* 特徴リスト */}
                      <ul className="flex flex-col gap-1.5 mb-4">
                        {[product.working_point, product.daily_amount, product.doctor_comment].filter((f): f is string => Boolean(f)).map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-gray-600 break-all">
                            <span className="text-indigo-500 shrink-0 mt-0.5"><IconCheck /></span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* 内容量 */}
                      {product.volume && <p className="text-xs text-gray-400 mb-3">内容量：{product.volume}</p>}

                      {/* 医院が設定した通常・期間別価格 */}
                      <div className="flex items-end gap-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">通常価格（月額）</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ¥{product.price.toLocaleString()}
                            <span className="text-sm text-gray-400 font-normal ml-1">/{product.unit ?? '月'}</span>
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 pb-0.5">
                          <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                            3ヶ月: ¥{product.threeMonthPrice.toLocaleString()}/月
                          </span>
                          <span className="text-xs text-[#2563EB] bg-[#EFF6FF] border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                            6ヶ月: ¥{product.sixMonthPrice.toLocaleString()}/月
                          </span>
                        </div>
                      </div>

                      {/* ボタン */}
                      <Link
                        href={`/subscription/${product.id}`}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm active:scale-95"
                      >
                        定期購入する
                        <IconArrowRight />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-700 mb-2">定期購入に関するご注意</p>
            <ul className="flex flex-col gap-1.5 list-disc list-inside">
              <li>定期購入は最低1回のお届けからご利用いただけます。</li>
              <li>解約は次回お届け予定日の7日前までにお申し出ください。</li>
              <li>お届け日・お届け先は申込後もマイページから変更可能です。</li>
              <li>期間別価格は定期購入コース継続中のみ適用されます。</li>
            </ul>
          </div>

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
