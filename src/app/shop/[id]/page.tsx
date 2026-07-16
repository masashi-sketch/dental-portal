'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import BottomNav from '../../components/BottomNav';
import { useToast } from '@/hooks/useToast';
import { products } from '../data';

/* ── アイコン ── */
function IconBell() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function IconUser() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconCartHeader() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
function IconMenu() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>;
}
function IconX() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function IconClinic() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function IconCalendar() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function IconFile() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></svg>;
}
function IconRefresh() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}
function IconBag() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
function IconQA() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}
function IconLogout() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}
function IconStar() {
  return <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
}
function IconArrowLeft() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
}
function IconCheck() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>;
}
function IconRefreshSmall() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}
function IconShield() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function IconTruck() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>;
}

/* ── 商品画像 ── */
function ProductImage({ type, large = false }: { type: string; large?: boolean }) {
  const config: Record<string, { from: string; to: string; icon: React.ReactNode }> = {
    supplement: {
      from: '#6366f1', to: '#a5b4fc',
      icon: (
        <svg width={large ? 80 : 48} height={large ? 80 : 48} fill="none" viewBox="0 0 64 64">
          <ellipse cx="32" cy="32" rx="14" ry="22" fill="white" fillOpacity="0.25" />
          <ellipse cx="32" cy="20" rx="14" ry="10" fill="white" fillOpacity="0.35" />
          <ellipse cx="32" cy="44" rx="14" ry="10" fill="white" fillOpacity="0.15" />
          <line x1="18" y1="32" x2="46" y2="32" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
        </svg>
      ),
    },
    yogurt: {
      from: '#f59e0b', to: '#fde68a',
      icon: (
        <svg width={large ? 80 : 48} height={large ? 80 : 48} fill="none" viewBox="0 0 64 64">
          <rect x="18" y="20" width="28" height="32" rx="4" fill="white" fillOpacity="0.3" />
          <rect x="20" y="14" width="24" height="10" rx="3" fill="white" fillOpacity="0.4" />
          <path d="M24 34 Q32 30 40 34" stroke="white" strokeWidth="2" strokeOpacity="0.6" fill="none" />
          <circle cx="32" cy="40" r="3" fill="white" fillOpacity="0.5" />
        </svg>
      ),
    },
    toothbrush: {
      from: '#0891b2', to: '#67e8f9',
      icon: (
        <svg width={large ? 80 : 48} height={large ? 80 : 48} fill="none" viewBox="0 0 64 64">
          <rect x="29" y="8" width="6" height="36" rx="3" fill="white" fillOpacity="0.35" />
          <rect x="22" y="8" width="20" height="14" rx="4" fill="white" fillOpacity="0.25" />
          <rect x="24" y="10" width="4" height="10" rx="2" fill="white" fillOpacity="0.4" />
          <rect x="30" y="10" width="4" height="10" rx="2" fill="white" fillOpacity="0.4" />
          <rect x="36" y="10" width="4" height="10" rx="2" fill="white" fillOpacity="0.4" />
          <rect x="29" y="44" width="6" height="12" rx="3" fill="white" fillOpacity="0.35" />
        </svg>
      ),
    },
    oral: {
      from: '#10b981', to: '#6ee7b7',
      icon: (
        <svg width={large ? 80 : 48} height={large ? 80 : 48} fill="none" viewBox="0 0 64 64">
          <rect x="22" y="10" width="20" height="40" rx="8" fill="white" fillOpacity="0.3" />
          <rect x="26" y="8" width="12" height="6" rx="2" fill="white" fillOpacity="0.45" />
          <rect x="26" y="24" width="12" height="3" rx="1.5" fill="white" fillOpacity="0.4" />
          <rect x="26" y="30" width="12" height="3" rx="1.5" fill="white" fillOpacity="0.3" />
        </svg>
      ),
    },
  };
  const c = config[type] ?? config.oral;
  return (
    <div
      className={`w-full flex items-center justify-center rounded-2xl ${large ? 'h-64 sm:h-72' : 'h-44'}`}
      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
    >
      {c.icon}
    </div>
  );
}

const navItems = [
  { label: 'クリニック紹介', icon: <IconClinic />,  href: '/clinic' },
  { label: '予約・受診履歴', icon: <IconCalendar />, href: '#' },
  { label: '診療情報',       icon: <IconFile />,     href: '#', dividerAfter: true },
  { label: '定期購入',       icon: <IconRefresh />,  href: '/subscription' },
  { label: 'おすすめ商品',  icon: <IconBag />,      href: '/shop', active: true },
  { label: 'Q & A',          icon: <IconQA />,       href: '/qa' },
];

const headerNavLinks = ['クリニック紹介', '診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const product = products.find((p) => p.id === id);

  const [menuOpen, setMenuOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { toast, showToast } = useToast();

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">商品が見つかりませんでした。</p>
          <Link href="/shop" className="text-[#2563EB] hover:underline text-sm">← 一覧に戻る</Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    setAdded(true);
    showToast(`「${product.name}」を${qty}点カートに追加しました`);
  };

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 md:pb-0">

      {/* トースト */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 max-w-xs sm:max-w-sm">
          <span className="text-emerald-400 shrink-0"><IconCheck /></span>
          <span>{toast}</span>
        </div>
      )}

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
            <span className="text-gray-900 font-bold text-lg tracking-tight">テストデンタル歯科</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-600">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="hover:text-[#2563EB] transition-colors">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-gray-500">
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconBell /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
            <button className="relative hover:text-[#2563EB] transition-colors">
              <IconCartHeader />
              {added && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {qty}
                </span>
              )}
            </button>
            <button className="md:hidden hover:text-[#2563EB] transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <IconX /> : <IconMenu />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="block py-3 text-sm text-gray-600 border-b border-gray-50 hover:text-[#2563EB] transition-colors">{label}</a>
            ))}
          </div>
        )}
      </header>

      {/* ボトムナビ（モバイル） */}
      <BottomNav active="shop" />

      {/* ボディ */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 gap-6 sm:gap-8">

        {/* サイドバー */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <nav className="flex flex-col gap-0.5">
              {navItems.map((item) => (
                <div key={item.label}>
                  <Link href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      item.active ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={item.active ? 'text-[#2563EB]' : 'text-gray-400'}>{item.icon}</span>
                    {item.label}
                  </Link>
                  {item.dividerAfter && <div className="my-2 h-px bg-gray-100" />}
                </div>
              ))}
              <div className="my-2 h-px bg-gray-100" />
              <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                <span className="text-gray-400"><IconLogout /></span>ログアウト
              </Link>
            </nav>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col gap-5 min-w-0">

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
                  <ProductImage type={product.imageType} large />
                  {product.badge && (
                    <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${product.badgeColor}`}>
                      {product.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* 情報エリア */}
              <div className="flex-1 px-5 pb-6 sm:py-6 sm:pr-6 sm:pl-0">
                <p className="text-xs text-gray-400 mb-1">{product.category}</p>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug mb-3">{product.name}</h1>

                {/* 評価 */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < Math.floor(product.rating) ? 'text-amber-400' : 'text-gray-200'}>
                        <IconStar />
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{product.rating}</span>
                  <span className="text-xs text-gray-400">({product.reviews}件のレビュー)</span>
                </div>

                {/* 価格 */}
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">¥{product.price.toLocaleString()}</span>
                  <span className="text-sm text-gray-400">/{product.unit}（税込）</span>
                </div>

                {product.tag && (
                  <span className="inline-block text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-4">
                    {product.tag}
                  </span>
                )}

                <p className="text-sm text-gray-600 leading-relaxed mb-5 break-all">{product.desc}</p>

                {/* 数量セレクター */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-gray-600 font-medium">数量</span>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="w-12 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-xl font-medium"
                    >
                      −
                    </button>
                    <span className="w-12 text-center text-sm font-semibold text-gray-800">{qty}</span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      className="w-12 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-xl font-medium"
                    >
                      ＋
                    </button>
                  </div>
                </div>

                {/* 購入ボタン */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAddToCart}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                      added
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-[#2563EB] text-white hover:bg-[#1d4ed8] shadow-sm'
                    }`}
                  >
                    <IconCartHeader />
                    {added ? 'カートに追加済み' : 'カートに追加する'}
                  </button>
                  {product.tag === '定期購入対応' && (
                    <Link
                      href="/subscription"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                    >
                      <IconRefreshSmall />
                      定期購入で注文
                    </Link>
                  )}
                </div>

                {/* 安心ポイント */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="text-[#2563EB]"><IconShield /></span>歯科医師監修
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="text-[#2563EB]"><IconTruck /></span>3,000円以上で送料無料
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="text-[#2563EB]"><IconRefreshSmall /></span>いつでも解約可能
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 商品詳細 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">商品詳細</h2>
            <div className="divide-y divide-gray-50">
              {[
                { label: '内容量',    value: product.volume },
                { label: '成分',      value: product.ingredients },
                { label: '使用方法',  value: product.howToUse },
                { label: '注意事項',  value: product.caution },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-4 py-3.5 text-sm">
                  <span className="text-gray-400 shrink-0 w-20">{label}</span>
                  <span className="text-gray-700 leading-relaxed break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>

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
                    <ProductImage type={p.imageType} />
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{p.name}</p>
                      <p className="text-sm font-bold text-gray-900">¥{p.price.toLocaleString()}<span className="text-xs text-gray-400 font-normal ml-1">/{p.unit}</span></p>
                    </div>
                  </Link>
                ))}
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
            <span className="text-white font-semibold">テストデンタル歯科</span>
          </div>
          <div className="text-gray-500 text-xs">© 2026 テストデンタル歯科. All Rights Reserved.</div>
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
