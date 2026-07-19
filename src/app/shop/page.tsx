'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';
import PatientSidebarNav, { IconBag, IconLogout } from '@/components/PatientSidebarNav';
import PreviewModeBanner from '@/components/PreviewModeBanner';
import ProductVisual from '@/components/ProductVisual';
import SalesRepAvatar from '@/components/SalesRepAvatar';
import { usePatientClinicBranding } from '@/hooks/usePatientClinicBranding';
import { usePrimaryDoctor } from '@/hooks/usePrimaryDoctor';
import { useSafeState } from '@/hooks/useSafeState';
import { PRODUCT_BADGE_CLASS, PRODUCT_CATEGORIES } from '@/lib/productDisplay';
import type { Product } from '@/lib/supabase/types';

/* ── ヘッダー共通アイコン ── */
function IconBell() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
/* 商品画像は共通コンポーネントProductVisual（imageType→グラデーション描画）を使用 */

const categories = ['すべて', ...PRODUCT_CATEGORIES] as const;

const headerNavLinks = ['クリニック紹介', '診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

export default function ShopPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { clinicName, navVisibility } = usePatientClinicBranding();
  const { doctor } = usePrimaryDoctor();
  const [activeCategory, setActiveCategory] = useState<string>('すべて');
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

  const doctorLabel = doctor ? `${doctor.name}先生` : `${clinicName ?? 'デンタルポータル'} 院長`;
  // 先生のおすすめ一覧表に出すのは、推奨度またはコメントが入力されている商品のみ
  const recommendedProducts = products.filter((p) => p.recommendation_level || p.doctor_comment);

  const filtered =
    activeCategory === 'すべて'
      ? products
      : products.filter((p) => p.category === activeCategory);

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

          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-600">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="hover:text-[#2563EB] transition-colors">{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-4 text-gray-500">
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconBell /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
            <button className="md:hidden hover:text-[#2563EB] transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <IconX /> : <IconMenu />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="block py-3 text-sm text-gray-600 border-b border-gray-50 hover:text-[#2563EB] transition-colors">
                {label}
              </a>
            ))}
          </div>
        )}
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

          {/* ページタイトル */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#EFF6FF] rounded-xl flex items-center justify-center text-[#2563EB]">
                  <IconBag />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">おすすめ商品</h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doctor ? `${doctorLabel}が日々の診療でおすすめしている製品です` : '歯科医師・歯科衛生士が厳選したオーラルケア用品'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 先生からのおすすめバナー */}
          <div className="bg-gradient-to-r from-[#2563EB] to-[#60a5fa] rounded-2xl p-5 sm:p-6 text-white flex items-start gap-4">
            {doctor ? (
              <SalesRepAvatar name={doctor.name} photoUrl={doctor.photo_url} size={48} className="!rounded-full mt-0.5" />
            ) : (
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg width="26" height="26" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-blue-100 text-xs font-semibold mb-0.5">{doctorLabel}より</p>
              <p className="font-bold text-base sm:text-lg leading-snug mb-2">
                L.ロイテリ菌で、口腔ケアを習慣に
              </p>
              <p className="text-blue-100 text-xs sm:text-sm leading-relaxed mb-3">
                歯周病・口臭の改善に科学的根拠が認められた乳酸菌サプリです。毎日続けることで口腔内の善玉菌が増え、定期的なメンテナンス効果も高まります。ぜひ試してみてください。
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">院長おすすめ No.1</span>
                <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">歯科医師監修</span>
                <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">定期購入対応</span>
              </div>
            </div>
          </div>

          {/* 先生のおすすめ一覧 */}
          {recommendedProducts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">{doctorLabel}のおすすめ一覧</p>
                <p className="text-[11px] text-gray-400 mt-0.5">日々の診療をふまえた、セルフケア用品のご案内です</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[11px]">
                      <th className="text-left font-medium px-4 py-2 whitespace-nowrap">商品名</th>
                      <th className="text-left font-medium px-3 py-2 hidden md:table-cell">主な働き</th>
                      <th className="text-left font-medium px-3 py-2 whitespace-nowrap">1日の目安</th>
                      <th className="text-center font-medium px-3 py-2 whitespace-nowrap">推奨度</th>
                      <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">先生のコメント</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recommendedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{p.name}</td>
                        <td className="px-3 py-2.5 text-gray-500 hidden md:table-cell">{p.working_point}</td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{p.daily_amount}</td>
                        <td className="px-3 py-2.5 text-center text-amber-500 font-bold">{p.recommendation_level}</td>
                        <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">{p.doctor_comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* カテゴリフィルター */}
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-2 min-w-max md:flex-wrap md:min-w-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-500 hover:border-[#2563EB] hover:text-[#2563EB]'
                  }`}
                >
                  {cat}
                  {cat !== 'すべて' && (
                    <span className={`ml-1.5 text-xs ${activeCategory === cat ? 'text-blue-200' : 'text-gray-400'}`}>
                      {products.filter((p) => p.category === cat).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 商品グリッド */}
          {!productsLoaded && (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="w-full h-36 sm:h-44 bg-gray-100 animate-pulse" />
                  <div className="p-4 flex flex-col gap-2">
                    <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {productsLoaded && filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-10 text-center text-sm text-gray-400">
              現在表示できる商品はありません
            </div>
          )}
          {productsLoaded && filtered.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* 商品画像（詳細ページへリンク） */}
                  <Link href={`/shop/${product.id}`} className="relative block">
                    <ProductVisual type={product.image_type} />
                    {product.badge && product.badge_color && (
                      <span className={`absolute top-3 left-3 text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRODUCT_BADGE_CLASS[product.badge_color]}`}>
                        {product.badge}
                      </span>
                    )}
                  </Link>

                  {/* 商品情報 */}
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-xs text-gray-400 mb-1">{product.category}</p>
                    <Link href={`/shop/${product.id}`}>
                      <h3 className="text-sm font-bold text-gray-800 leading-snug mb-2 line-clamp-2 hover:text-[#2563EB] transition-colors">{product.name}</h3>
                    </Link>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2 sm:line-clamp-3 flex-1 break-all">{product.description}</p>

                    {/* 先生の一言コメント */}
                    {product.doctor_comment && (
                      <div className="flex items-start gap-1.5 mb-3 bg-blue-50/60 border border-blue-100/60 rounded-lg px-2.5 py-2">
                        <span className="text-[10px] font-bold text-[#2563EB] shrink-0">{doctorLabel}</span>
                        {product.recommendation_level && (
                          <span className="text-[10px] text-amber-500 font-bold shrink-0">{product.recommendation_level}</span>
                        )}
                        <p className="text-[11px] text-gray-600 leading-snug break-all">{product.doctor_comment}</p>
                      </div>
                    )}

                    {product.subscription_available && (
                      <span className="inline-block text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 mb-3 w-fit">
                        定期購入対応
                      </span>
                    )}

                    {/* 価格＋相談導線 */}
                    <div className="flex flex-col gap-2 mt-auto">
                      <div>
                        <span className="text-sm font-semibold text-gray-700">¥{product.price.toLocaleString()}</span>
                        {product.unit && <span className="text-xs text-gray-400 ml-1">/{product.unit}</span>}
                      </div>
                      <Link
                        href={product.subscription_available ? '/subscription' : '/clinic'}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] transition-all"
                      >
                        {product.subscription_available ? '定期購入について相談する' : '医院に相談する'}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 注意書き */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 text-xs text-gray-400 leading-relaxed">
            ※ 掲載しているのは、当院で歯科医師・歯科衛生士が実際に使用感を確認した製品です。<br />
            ※ ご自身に合うか分からない場合は、次回の受診時にお気軽にご相談ください。<br />
            ※ 価格は税込表示です。
          </div>

        </main>
      </div>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 mt-auto hidden md:block">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center gap-4 text-xs sm:text-sm md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#2563EB] rounded-md flex items-center justify-center">
              <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-white font-semibold">{clinicName ?? 'デンタルポータル'}</span>
          </div>
          <div className="text-gray-500 text-xs">© 2026 {clinicName ?? 'デンタルポータル'}. All Rights Reserved.</div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a>
            <a href="#" className="hover:text-white transition-colors">特定商取引法</a>
            <a href="#" className="hover:text-white transition-colors">お問い合わせ</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
