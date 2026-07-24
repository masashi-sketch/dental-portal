'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import BottomNav from '../../components/BottomNav';
import PatientSidebarNav, { IconLogout } from '@/components/PatientSidebarNav';
import ProductVisual from '@/components/ProductVisual';
import { usePatientClinicBranding } from '@/hooks/usePatientClinicBranding';
import { useSafeState } from '@/hooks/useSafeState';
import { PRODUCT_BADGE_CLASS } from '@/lib/productDisplay';
import type { Product } from '@/lib/supabase/types';

/* ── アイコン ── */
function IconBell() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function IconUser() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconArrowLeft() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
}
function IconRefreshSmall() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}
function IconShield() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}

// 商品詳細。一覧と同じ /api/patient-portal/products をfetchしてfindする
// （非表示・非公開の商品は一覧に含まれないため、直接URLアクセスでも自動的に
// 「見つかりません」になる）。カート・星評価等のEC要素は撤去済みで、
// 導線は一覧と同じ「定期購入について相談する／医院に相談する」。
export default function ProductDetailPage() {
  const params = useParams();
  const id = String(params.id);

  const { clinicName, navVisibility } = usePatientClinicBranding();
  const [products, setProducts] = useSafeState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useSafeState(false);

  const fetchProducts = useCallback(() => {
    fetch('/api/patient-portal/products')
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoaded(true));
  }, [setProducts, setProductsLoaded]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const product = products.find((p) => p.id === id);

  if (productsLoaded && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">商品が見つかりませんでした。</p>
          <Link href="/shop" className="text-[#2563EB] hover:underline text-sm">← 一覧に戻る</Link>
        </div>
      </div>
    );
  }

  const relatedProducts = product
    ? products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3)
    : [];

  const detailRows = product
    ? [
        { label: '内容量', value: product.volume },
        { label: '成分', value: product.ingredients },
        { label: '使用方法', value: product.how_to_use },
        { label: '注意事項', value: product.caution },
      ].filter((row) => row.value)
    : [];

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
          <div className="flex items-center gap-4 text-gray-500">
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconBell /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
          </div>
        </div>
      </header>

      {/* ボトムナビ（モバイル） */}
      <BottomNav active="shop" navVisibility={navVisibility} />

      {/* ボディ */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 gap-6 sm:gap-8">

        {/* サイドバー */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <PatientSidebarNav active="shop" navVisibility={navVisibility}>
              <div className="my-2 h-px bg-gray-100" />
              <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                <span className="text-gray-400"><IconLogout /></span>ログアウト
              </Link>
            </PatientSidebarNav>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col gap-5 min-w-0">

          {!productsLoaded && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-72 sm:shrink-0 p-4 sm:p-6">
                  <div className="w-full h-64 sm:h-72 bg-gray-100 rounded-2xl animate-pulse" />
                </div>
                <div className="flex-1 px-5 pb-6 sm:py-6 sm:pr-6 sm:pl-0 flex flex-col gap-3">
                  <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-6 w-3/4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {productsLoaded && product && (
            <>
              {/* パンくず */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Link href="/shop" className="flex items-center gap-1 hover:text-[#2563EB] transition-colors">
                  <IconArrowLeft />おすすめ商品一覧
                </Link>
                <span>/</span>
                <span className="text-gray-500 truncate">{product.name}</span>
              </div>

              {/* 商品メインカード */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row">

                  {/* 画像エリア */}
                  <div className="sm:w-72 sm:shrink-0 p-4 sm:p-6">
                    <div className="relative">
                      <ProductVisual type={product.image_type} imageUrl={product.image_url} className="w-full h-64 sm:h-72 flex items-center justify-center rounded-2xl" />
                      {product.badge && product.badge_color && (
                        <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${PRODUCT_BADGE_CLASS[product.badge_color]}`}>
                          {product.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 情報エリア */}
                  <div className="flex-1 px-5 pb-6 sm:py-6 sm:pr-6 sm:pl-0">
                    <p className="text-xs text-gray-400 mb-1">{product.category}</p>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug mb-3">{product.name}</h1>

                    {/* 価格 */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-2xl font-bold text-gray-900">¥{product.price.toLocaleString()}</span>
                      {product.unit && <span className="text-sm text-gray-400">/{product.unit}（税込）</span>}
                    </div>

                    {product.subscription_available && (
                      <span className="inline-block text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-4">
                        定期購入対応
                      </span>
                    )}

                    {product.description && (
                      <p className="text-sm text-gray-600 leading-relaxed mb-5 break-all">{product.description}</p>
                    )}

                    {/* 先生のおすすめ */}
                    {product.doctor_comment && (
                      <div className="flex items-start gap-2 mb-5 bg-blue-50/60 border border-blue-100/60 rounded-xl px-4 py-3">
                        {product.recommendation_level && (
                          <span className="text-sm text-amber-500 font-bold shrink-0">{product.recommendation_level}</span>
                        )}
                        <p className="text-xs text-gray-600 leading-relaxed break-all">{product.doctor_comment}</p>
                      </div>
                    )}

                    {/* 相談導線（一覧と同じ出し分け） */}
                    <Link
                      href={product.subscription_available ? '/subscription' : '/clinic'}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                    >
                      {product.subscription_available && <IconRefreshSmall />}
                      {product.subscription_available ? '定期購入について相談する' : '医院に相談する'}
                    </Link>

                    {/* 安心ポイント */}
                    <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-[#2563EB]"><IconShield /></span>歯科医師監修
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-[#2563EB]"><IconShield /></span>当院で使用感を確認した製品です
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 商品詳細（未入力の項目は非表示） */}
              {detailRows.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-4">商品詳細</h2>
                  <div className="divide-y divide-gray-50">
                    {detailRows.map(({ label, value }) => (
                      <div key={label} className="flex gap-4 py-3.5 text-sm">
                        <span className="text-gray-400 shrink-0 w-20">{label}</span>
                        <span className="text-gray-700 leading-relaxed break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 関連商品 */}
              {relatedProducts.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-3">同じカテゴリの商品</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {relatedProducts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/shop/${p.id}`}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <ProductVisual type={p.image_type} imageUrl={p.image_url} className="w-full h-44 flex items-center justify-center rounded-t-2xl" />
                        <div className="p-3">
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{p.name}</p>
                          <p className="text-sm font-bold text-gray-900">
                            ¥{p.price.toLocaleString()}
                            {p.unit && <span className="text-xs text-gray-400 font-normal ml-1">/{p.unit}</span>}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
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
