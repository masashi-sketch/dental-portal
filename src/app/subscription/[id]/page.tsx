'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import BottomNav from '../../components/BottomNav';
import { subProducts } from '../data';

function IconBell() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function IconUser() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconMenu() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>;
}
function IconXClose() {
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
function IconArrowLeft() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
}
function IconCheck() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>;
}
function IconHome() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}

/* ── サプリメント商品画像（小） ── */
function SupplementImageSm({ type }: { type: string }) {
  const configs: Record<string, { from: string; to: string }> = {
    capsule:  { from: '#4f46e5', to: '#818cf8' },
    tablet:   { from: '#d97706', to: '#fbbf24' },
    chewable: { from: '#059669', to: '#34d399' },
    multi:    { from: '#7c3aed', to: '#c4b5fd' },
  };
  const c = configs[type] ?? configs.capsule;
  return (
    <div
      className="w-20 h-20 shrink-0 rounded-xl flex items-center justify-center"
      style={{ background: `linear-gradient(145deg, ${c.from}, ${c.to})` }}
    >
      <svg width="36" height="36" fill="none" viewBox="0 0 64 64">
        <ellipse cx="32" cy="32" rx="12" ry="20" fill="white" fillOpacity="0.25" />
        <ellipse cx="32" cy="22" rx="12" ry="9" fill="white" fillOpacity="0.3" />
        <line x1="20" y1="32" x2="44" y2="32" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
      </svg>
    </div>
  );
}

const navItems = [
  { label: 'ホーム',         icon: <IconHome />,     href: '/home' },
  { label: 'クリニック紹介', icon: <IconClinic />,  href: '/clinic' },
  { label: '予約・受診履歴', icon: <IconCalendar />, href: '#' },
  { label: '診療情報',       icon: <IconFile />,     href: '#', dividerAfter: true },
  { label: '定期購入',       icon: <IconRefresh />,  href: '/subscription', active: true },
  { label: 'おすすめ商品',  icon: <IconBag />,      href: '/shop' },
  { label: 'Q & A',          icon: <IconQA />,       href: '/qa' },
];

const headerNavLinks = ['クリニック紹介', '診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

type Period = '6ヶ月' | '3ヶ月';
type Delivery = '自宅' | '医院';

export default function SubscriptionOrderPage() {
  const params = useParams();
  const id = Number(params.id);
  const product = subProducts.find((p) => p.id === id);

  const [menuOpen, setMenuOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [period, setPeriod] = useState<Period | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">商品が見つかりませんでした。</p>
          <Link href="/subscription" className="text-[#2563EB] hover:underline text-sm">← 定期購入トップへ</Link>
        </div>
      </div>
    );
  }

  const discountRate = period === '6ヶ月' ? 0.1 : period === '3ヶ月' ? 0.05 : 0;
  const months = period === '6ヶ月' ? 6 : 3;
  const monthlyPrice = Math.floor(product.priceMonthly * (1 - discountRate));
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
            <span className="text-gray-900 font-bold text-lg tracking-tight">テストデンタル歯科</span>
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
              {menuOpen ? <IconXClose /> : <IconMenu />}
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
        <main className="flex-1 flex flex-col gap-5 min-w-0">

          {/* パンくず */}
          {step < 4 && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Link href="/subscription" className="flex items-center gap-1 hover:text-[#2563EB] transition-colors">
                <IconArrowLeft />定期購入
              </Link>
              <span>/</span>
              <span className="text-gray-500 truncate">{product.name}</span>
            </div>
          )}

          {/* 商品サマリーカード */}
          {step < 4 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <SupplementImageSm type={product.imageType} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5 break-all">{product.shortDesc}</p>
                <p className="font-bold text-gray-900 text-sm leading-snug break-all">{product.name}</p>
                <p className="text-xs text-gray-400 mt-1 break-all">{product.volume}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">月額（通常）</p>
                <p className="text-lg font-bold text-gray-900">¥{product.priceMonthly.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* ステップインジケーター */}
          {step < 4 && (
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
              <h2 className="text-lg font-bold text-gray-900 mb-1">定期購入の期間を選択</h2>
              <p className="text-sm text-gray-400 mb-6">まとめて申し込むほどお得になります</p>

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
                          ¥{Math.floor(product.priceMonthly * 0.9).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400">/月</span>
                        <span className="text-sm text-gray-300 line-through">¥{product.priceMonthly.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        合計 <span className="font-semibold text-gray-900">¥{(Math.floor(product.priceMonthly * 0.9) * 6).toLocaleString()}</span>（6ヶ月分・税込）
                      </p>
                      <p className="text-xs text-indigo-600 mt-2 font-medium">
                        ¥{(product.priceMonthly * 6 - Math.floor(product.priceMonthly * 0.9) * 6).toLocaleString()} お得！
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
                          ¥{Math.floor(product.priceMonthly * 0.95).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400">/月</span>
                        <span className="text-sm text-gray-300 line-through">¥{product.priceMonthly.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        合計 <span className="font-semibold text-gray-900">¥{(Math.floor(product.priceMonthly * 0.95) * 3).toLocaleString()}</span>（3ヶ月分・税込）
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
                  onClick={() => setDelivery('自宅')}
                  className={`w-full text-left border-2 rounded-2xl p-5 transition-all ${
                    delivery === '自宅'
                      ? 'border-[#4f46e5] bg-indigo-50'
                      : 'border-gray-100 hover:border-indigo-200 bg-white'
                  }`}
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
                      <p className="text-sm text-gray-500 ml-[52px]">ご登録住所へ毎月お届けします。</p>
                      <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-600 ml-0">
                        <p className="font-semibold mb-1">お届け先住所（登録情報）</p>
                        <p>〒100-0001　東京都千代田区丸の内1-1-1</p>
                        <p>山田 太郎 様</p>
                      </div>
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
                        <p>テストデンタル歯科</p>
                        <p>〒100-0000　東京都中央区銀座1-1-1　銀座ビル3F</p>
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
                  <SupplementImageSm type={product.imageType} />
                  <div>
                    <p className="font-bold text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{product.volume}</p>
                  </div>
                </div>

                {/* 詳細 */}
                <div className="divide-y divide-gray-50 mt-1">
                  {[
                    { label: 'コース',       value: `${period}コース` },
                    { label: 'お届け先',     value: delivery === '自宅' ? 'ご自宅（登録住所）' : '医院（テストデンタル歯科）' },
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
                  定期購入のご契約後、次回お届け予定日の7日前までに解約申請がない場合は自動継続となります。
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
                  onClick={() => setStep(4)}
                  className="flex-1 py-4 rounded-xl font-bold text-base bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white hover:opacity-90 shadow-sm transition-opacity active:scale-95"
                >
                  この内容で申し込む
                </button>
              </div>
            </div>
          )}

          {/* ──── STEP 4: 完了 ──── */}
          {step === 4 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#818cf8] flex items-center justify-center mb-6 shadow-lg">
                <svg width="40" height="40" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">お申し込みが完了しました！</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-2">
                {product.name}の定期購入（{period}コース）を受け付けました。
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                お届け先：{delivery === '自宅' ? 'ご自宅（登録住所）' : '医院（テストデンタル歯科）'}
              </p>

              <div className="bg-gray-50 rounded-2xl p-5 w-full max-w-sm text-left mb-8">
                <p className="text-xs font-semibold text-gray-500 mb-3">申込内容</p>
                {[
                  { label: '商品', value: product.name },
                  { label: 'コース', value: `${period}コース` },
                  { label: 'お届け先', value: delivery === '自宅' ? 'ご自宅' : '医院' },
                  { label: '月額', value: `¥${monthlyPrice.toLocaleString()}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-800 font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <Link
                  href="/home"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#4f46e5] text-white font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <IconHome />ホームへ戻る
                </Link>
                <Link
                  href="/subscription"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  他の商品を見る
                </Link>
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
