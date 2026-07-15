'use client';

import Link from 'next/link';
import { useState } from 'react';
import BottomNav from '../components/BottomNav';
import PreviewModeBanner from '@/components/PreviewModeBanner';
import { usePatientClinicBranding } from '@/hooks/usePatientClinicBranding';
import { subProducts } from './data';

function IconBell() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function IconUser() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
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
function IconPill() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7Z" /><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" strokeOpacity="0.5" /></svg>;
}
function IconLogout() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
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
function IconHome() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function IconStar() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}

/* ── サプリメント商品画像 ── */
function SupplementImage({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 52, md: 72, lg: 96 };
  const s = sizeMap[size];

  const configs: Record<string, { from: string; to: string; icon: React.ReactNode }> = {
    capsule: {
      from: '#4f46e5', to: '#818cf8',
      icon: (
        <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
          <ellipse cx="40" cy="40" rx="16" ry="26" fill="white" fillOpacity="0.18" />
          <ellipse cx="40" cy="26" rx="16" ry="12" fill="white" fillOpacity="0.32" />
          <ellipse cx="40" cy="54" rx="16" ry="12" fill="white" fillOpacity="0.12" />
          <line x1="24" y1="40" x2="56" y2="40" stroke="white" strokeWidth="2" strokeOpacity="0.45" />
          <ellipse cx="40" cy="16" rx="7" ry="4" fill="white" fillOpacity="0.25" />
          <circle cx="52" cy="28" r="3" fill="white" fillOpacity="0.2" />
          <circle cx="30" cy="55" r="2.5" fill="white" fillOpacity="0.2" />
        </svg>
      ),
    },
    tablet: {
      from: '#d97706', to: '#fbbf24',
      icon: (
        <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="22" fill="white" fillOpacity="0.2" />
          <circle cx="40" cy="40" r="16" fill="white" fillOpacity="0.18" />
          <line x1="24" y1="40" x2="56" y2="40" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
          <line x1="40" y1="24" x2="40" y2="56" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
          <circle cx="54" cy="26" r="5" fill="white" fillOpacity="0.2" />
          <circle cx="54" cy="26" r="3" fill="white" fillOpacity="0.28" />
          <circle cx="24" cy="54" r="4" fill="white" fillOpacity="0.18" />
        </svg>
      ),
    },
    chewable: {
      from: '#059669', to: '#34d399',
      icon: (
        <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
          <rect x="22" y="22" width="14" height="14" rx="4" fill="white" fillOpacity="0.28" />
          <rect x="44" y="22" width="14" height="14" rx="4" fill="white" fillOpacity="0.22" />
          <rect x="22" y="44" width="14" height="14" rx="4" fill="white" fillOpacity="0.22" />
          <rect x="44" y="44" width="14" height="14" rx="4" fill="white" fillOpacity="0.28" />
          <rect x="33" y="33" width="14" height="14" rx="4" fill="white" fillOpacity="0.18" />
          <circle cx="56" cy="56" r="6" fill="white" fillOpacity="0.15" />
        </svg>
      ),
    },
    multi: {
      from: '#7c3aed', to: '#c4b5fd',
      icon: (
        <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
          <rect x="26" y="12" width="28" height="42" rx="8" fill="white" fillOpacity="0.2" />
          <rect x="30" y="10" width="20" height="8" rx="3" fill="white" fillOpacity="0.35" />
          <rect x="30" y="24" width="20" height="4" rx="2" fill="white" fillOpacity="0.38" />
          <rect x="30" y="32" width="20" height="4" rx="2" fill="white" fillOpacity="0.28" />
          <rect x="30" y="40" width="20" height="4" rx="2" fill="white" fillOpacity="0.22" />
          <circle cx="57" cy="60" r="9" fill="white" fillOpacity="0.15" />
          <circle cx="57" cy="60" r="5" fill="white" fillOpacity="0.2" />
        </svg>
      ),
    },
  };

  const c = configs[type] ?? configs.capsule;
  const heightMap = { sm: 'h-36', md: 'h-48', lg: 'h-56 sm:h-64' };
  return (
    <div
      className={`w-full ${heightMap[size]} flex items-center justify-center rounded-2xl`}
      style={{ background: `linear-gradient(145deg, ${c.from}, ${c.to})` }}
    >
      {c.icon}
    </div>
  );
}

const navItems = [
  { label: 'ホーム',         icon: <IconHome />,     href: '/home' },
  { label: 'クリニック紹介', icon: <IconClinic />,  href: '/clinic' },
  { label: '予約・受診履歴', icon: <IconCalendar />, href: '#' },
  { label: '診療情報',       icon: <IconFile />,     href: '#', dividerAfter: true },
  { label: 'お薬の受け取り', icon: <IconPill />,     href: '/medication', dividerAfter: true },
  { label: '定期購入',       icon: <IconRefresh />,  href: '/subscription', active: true },
  { label: 'おすすめ商品',  icon: <IconBag />,      href: '/shop' },
  { label: 'Q & A',          icon: <IconQA />,       href: '/qa' },
];

const headerNavLinks = ['クリニック紹介', '診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

const benefits = [
  { icon: <IconTruck />, title: '毎月自動お届け', desc: '申込後は手続き不要。毎月定期的にお届けします。' },
  { icon: <IconShield />, title: '品質保証', desc: '歯科医師・歯科衛生士監修の安心商品のみをご提供。' },
  { icon: <IconStar />, title: '特別割引', desc: '3ヶ月コースで5%OFF、6ヶ月コースで10%OFFでご提供。' },
  { icon: <IconCheck />, title: 'いつでも解約', desc: '次回お届け日の7日前までに解約申請でいつでも停止可。' },
];

export default function SubscriptionPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { clinicName } = usePatientClinicBranding();

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
          <div className="flex items-center gap-3 text-gray-500">
            <button className="hover:text-[#2563EB] transition-colors"><IconBell /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
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
      <BottomNav active="subscription" />

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
        <main className="flex-1 flex flex-col gap-6 min-w-0">

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
                <span className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full">6ヶ月コース 10%OFF</span>
                <span className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full">3ヶ月コース 5%OFF</span>
                <span className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full">いつでも解約OK</span>
              </div>
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
              <span className="text-xs text-gray-400">{subProducts.length}商品</span>
            </div>
            <div className="flex flex-col gap-4">
              {subProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* 画像 */}
                    <div className="sm:w-56 sm:shrink-0 p-4">
                      <div className="relative">
                        <SupplementImage type={product.imageType} size="md" />
                        <span className={`absolute top-2.5 left-2.5 text-xs font-semibold px-2.5 py-1 rounded-full ${product.badgeColor}`}>
                          {product.badge}
                        </span>
                      </div>
                    </div>

                    {/* 商品情報 */}
                    <div className="flex-1 px-4 pb-5 sm:py-5 sm:pr-5 sm:pl-0">
                      <h2 className="text-lg font-bold text-gray-900 mb-1">{product.name}</h2>
                      <p className="text-xs text-gray-400 mb-3 break-all">{product.shortDesc}</p>

                      {/* 特徴リスト */}
                      <ul className="flex flex-col gap-1.5 mb-4">
                        {product.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-gray-600 break-all">
                            <span className="text-indigo-500 shrink-0 mt-0.5"><IconCheck /></span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* 内容量 */}
                      <p className="text-xs text-gray-400 mb-3 break-all">内容量：{product.volume}</p>

                      {/* 価格と割引 */}
                      <div className="flex items-end gap-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">通常価格（月額）</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ¥{product.priceMonthly.toLocaleString()}
                            <span className="text-sm text-gray-400 font-normal ml-1">/月</span>
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 pb-0.5">
                          <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                            3ヶ月: ¥{Math.floor(product.priceMonthly * 0.95).toLocaleString()}/月
                          </span>
                          <span className="text-xs text-[#2563EB] bg-[#EFF6FF] border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                            6ヶ月: ¥{Math.floor(product.priceMonthly * 0.9).toLocaleString()}/月
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
              <li>割引価格は定期購入コース継続中のみ適用されます。</li>
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
