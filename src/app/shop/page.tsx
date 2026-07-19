'use client';

import Link from 'next/link';
import { useState } from 'react';
import BottomNav from '../components/BottomNav';
import PatientSidebarNav, { IconBag, IconLogout } from '@/components/PatientSidebarNav';
import PreviewModeBanner from '@/components/PreviewModeBanner';
import SalesRepAvatar from '@/components/SalesRepAvatar';
import { usePatientClinicBranding } from '@/hooks/usePatientClinicBranding';
import { usePrimaryDoctor } from '@/hooks/usePrimaryDoctor';
import { DOCTOR_RECOMMENDATIONS } from './doctorContent';

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
/* ── ダミー商品画像（グラデーション＋SVGアイコン） ── */
function ProductImage({ type }: { type: string }) {
  const config: Record<string, { from: string; to: string; icon: React.ReactNode }> = {
    supplement: {
      from: '#6366f1', to: '#a5b4fc',
      icon: (
        <svg width="48" height="48" fill="none" viewBox="0 0 64 64">
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
        <svg width="48" height="48" fill="none" viewBox="0 0 64 64">
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
        <svg width="48" height="48" fill="none" viewBox="0 0 64 64">
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
        <svg width="48" height="48" fill="none" viewBox="0 0 64 64">
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
      className="w-full h-36 sm:h-44 flex items-center justify-center rounded-t-2xl"
      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
    >
      {c.icon}
    </div>
  );
}

/* ── データ ── */
type Product = {
  id: number;
  category: string;
  imageType: string;
  badge?: string;
  badgeColor?: string;
  name: string;
  desc: string;
  price: number;
  unit: string;
  rating: number;
  reviews: number;
  tag?: string;
};

const products: Product[] = [
  {
    id: 1, category: 'サプリメント', imageType: 'supplement',
    badge: '歯科医推奨', badgeColor: 'bg-indigo-100 text-indigo-600',
    name: 'オーラルプロバイオティクス 30日分',
    desc: '口腔内の善玉菌を増やし、歯周病・口臭の予防をサポートする乳酸菌サプリ。毎日1粒で手軽にケア。',
    price: 3980, unit: '本', rating: 4.8, reviews: 128, tag: '定期購入対応',
  },
  {
    id: 2, category: 'サプリメント', imageType: 'supplement',
    badge: '新着', badgeColor: 'bg-rose-100 text-rose-600',
    name: 'カルシウム＋ビタミンD 60粒',
    desc: '歯と骨の健康維持に欠かせないカルシウムをビタミンDと一緒に配合。吸収率を高めた処方。',
    price: 2480, unit: '本', rating: 4.5, reviews: 64, tag: '',
  },
  {
    id: 3, category: 'サプリメント', imageType: 'supplement',
    badge: '定番人気', badgeColor: 'bg-amber-100 text-amber-600',
    name: '歯科専用 乳酸菌タブレット 90粒',
    desc: '噛んで溶かすチュアブルタイプ。口腔内で直接作用するL.ロイテリ菌を配合。後味もさわやか。',
    price: 1980, unit: '本', rating: 4.7, reviews: 213, tag: '定期購入対応',
  },
  {
    id: 4, category: 'ヨーグルト', imageType: 'yogurt',
    badge: '歯科医推奨', badgeColor: 'bg-indigo-100 text-indigo-600',
    name: 'プロデンティス ヨーグルト 100g',
    desc: '歯科専用に開発されたL.ロイテリ菌入りヨーグルト。毎日食べることで口腔フローラを整えます。',
    price: 980, unit: '個', rating: 4.6, reviews: 97, tag: '',
  },
  {
    id: 5, category: 'ヨーグルト', imageType: 'yogurt',
    badge: 'セット割', badgeColor: 'bg-emerald-100 text-emerald-600',
    name: 'オーラルケア ヨーグルト 6個セット',
    desc: '毎日続けやすいお得な6個パック。砂糖不使用・低カロリーで歯に優しい設計。まとめ買いでお得に。',
    price: 4980, unit: 'セット', rating: 4.7, reviews: 152, tag: '定期購入対応',
  },
  {
    id: 6, category: 'ヨーグルト', imageType: 'yogurt',
    badge: '新着', badgeColor: 'bg-rose-100 text-rose-600',
    name: 'L-92乳酸菌 飲むヨーグルト 200ml',
    desc: '飲むタイプで忙しい方にも続けやすい。免疫力サポートと口腔ケアを同時に叶えるドリンクタイプ。',
    price: 480, unit: '本', rating: 4.3, reviews: 41, tag: '',
  },
  {
    id: 7, category: '歯ブラシ', imageType: 'toothbrush',
    badge: '定番人気', badgeColor: 'bg-amber-100 text-amber-600',
    name: 'プロフェッショナル歯ブラシ やわらかめ',
    desc: '歯科衛生士監修。極細毛で歯周ポケットまで届く設計。歯ぐきに優しい独自カット毛を採用。',
    price: 880, unit: '本', rating: 4.9, reviews: 312, tag: '定期購入対応',
  },
  {
    id: 8, category: '歯ブラシ', imageType: 'toothbrush',
    badge: '歯科医推奨', badgeColor: 'bg-indigo-100 text-indigo-600',
    name: '超極細毛歯ブラシ 知覚過敏対応',
    desc: '0.01mmの超極細毛を採用。知覚過敏の方でも痛みなく磨けます。歯ぐき再生ケアにも最適。',
    price: 680, unit: '本', rating: 4.8, reviews: 189, tag: '',
  },
  {
    id: 9, category: '歯ブラシ', imageType: 'toothbrush',
    badge: 'セット割', badgeColor: 'bg-emerald-100 text-emerald-600',
    name: '電動歯ブラシ 替えブラシ 4本セット',
    desc: '主要電動歯ブラシ各社対応の替えブラシ。クリニック同品質のブラシを自宅でお使いいただけます。',
    price: 2980, unit: 'セット', rating: 4.6, reviews: 78, tag: '定期購入対応',
  },
  {
    id: 10, category: 'オーラルケア', imageType: 'oral',
    badge: '定番人気', badgeColor: 'bg-amber-100 text-amber-600',
    name: 'デンタルフロス ミント 50m',
    desc: 'ワックス加工で歯間に滑らかに入る。ミントフレーバーで使用後も爽やか。毎日のフロス習慣に。',
    price: 580, unit: '個', rating: 4.7, reviews: 267, tag: '定期購入対応',
  },
  {
    id: 11, category: 'オーラルケア', imageType: 'oral',
    badge: '歯科医推奨', badgeColor: 'bg-indigo-100 text-indigo-600',
    name: '薬用歯磨き粉 フッ素高濃度 1450ppm',
    desc: '高濃度フッ素1450ppmを配合した薬用歯磨き。再石灰化を促進し、虫歯を強力予防します。',
    price: 1280, unit: '個', rating: 4.8, reviews: 445, tag: '定期購入対応',
  },
  {
    id: 12, category: 'オーラルケア', imageType: 'oral',
    badge: '新着', badgeColor: 'bg-rose-100 text-rose-600',
    name: '薬用洗口液 歯周病対応 500ml',
    desc: '歯科医院でも使用されるCPC配合の洗口液。歯周病菌・口臭を24時間ケア。ノンアルコールで低刺激。',
    price: 1580, unit: '本', rating: 4.5, reviews: 93, tag: '',
  },
];

const categories = ['すべて', 'サプリメント', 'ヨーグルト', '歯ブラシ', 'オーラルケア'] as const;

const headerNavLinks = ['クリニック紹介', '診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

export default function ShopPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { clinicName, navVisibility } = usePatientClinicBranding();
  const { doctor } = usePrimaryDoctor();
  const [activeCategory, setActiveCategory] = useState<string>('すべて');

  const doctorLabel = doctor ? `${doctor.name}先生` : `${clinicName ?? 'デンタルポータル'} 院長`;
  const recommendationById = new Map(DOCTOR_RECOMMENDATIONS.map((r) => [r.productId, r]));

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
                  {DOCTOR_RECOMMENDATIONS.map((r) => {
                    const product = products.find((p) => p.id === r.productId);
                    if (!product) return null;
                    return (
                      <tr key={r.productId} className="hover:bg-gray-50/60">
                        <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{product.name}</td>
                        <td className="px-3 py-2.5 text-gray-500 hidden md:table-cell">{r.workingPoint}</td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{r.dailyAmount}</td>
                        <td className="px-3 py-2.5 text-center text-amber-500 font-bold">{r.recommendationLevel}</td>
                        <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">{r.comment}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((product) => {
              const rec = recommendationById.get(product.id);
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* 商品画像（詳細ページへリンク） */}
                  <Link href={`/shop/${product.id}`} className="relative block">
                    <ProductImage type={product.imageType} />
                    {product.badge && (
                      <span className={`absolute top-3 left-3 text-[11px] font-semibold px-2 py-0.5 rounded-full ${product.badgeColor}`}>
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
                    <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2 sm:line-clamp-3 flex-1 break-all">{product.desc}</p>

                    {/* 先生の一言コメント */}
                    {rec && (
                      <div className="flex items-start gap-1.5 mb-3 bg-blue-50/60 border border-blue-100/60 rounded-lg px-2.5 py-2">
                        <span className="text-[10px] font-bold text-[#2563EB] shrink-0">{doctorLabel}</span>
                        <span className="text-[10px] text-amber-500 font-bold shrink-0">{rec.recommendationLevel}</span>
                        <p className="text-[11px] text-gray-600 leading-snug break-all">{rec.comment}</p>
                      </div>
                    )}

                    {product.tag && (
                      <span className="inline-block text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 mb-3 w-fit">
                        {product.tag}
                      </span>
                    )}

                    {/* 価格＋相談導線 */}
                    <div className="flex flex-col gap-2 mt-auto">
                      <div>
                        <span className="text-sm font-semibold text-gray-700">¥{product.price.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 ml-1">/{product.unit}</span>
                      </div>
                      <Link
                        href={product.tag === '定期購入対応' ? '/subscription' : '/clinic'}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] transition-all"
                      >
                        {product.tag === '定期購入対応' ? '定期購入について相談する' : '医院に相談する'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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
