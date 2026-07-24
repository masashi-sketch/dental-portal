'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';
import PatientSidebarNav, { IconLogout, IconQA } from '@/components/PatientSidebarNav';
import { usePatientClinicBranding } from '@/hooks/usePatientClinicBranding';
import type { ClinicQa } from '@/lib/supabase/types';

function IconBell() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
function IconCart() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
      className={`transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// DBのカテゴリには色情報を持たせていないため、登場順で巡回して割り当てる。
const CATEGORY_COLOR_PALETTE = [
  'bg-blue-50 text-blue-600',
  'bg-emerald-50 text-emerald-600',
  'bg-amber-50 text-amber-600',
  'bg-pink-50 text-pink-600',
  'bg-violet-50 text-violet-600',
  'bg-cyan-50 text-cyan-600',
];

export default function QAPage() {
  const { clinicName, navVisibility } = usePatientClinicBranding();
  const [activeCategory, setActiveCategory] = useState<string>('すべて');
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [qaList, setQaList] = useState<ClinicQa[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/patient-portal/qa')
      .then((res) => (res.ok ? res.json() : { qa: [] }))
      .then((data) => { if (!cancelled) setQaList(data.qa ?? []); })
      .catch(() => { if (!cancelled) setQaList([]); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const toggle = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const categories = ['すべて', ...Array.from(new Set(qaList.map((q) => q.category)))];
  const categoryColor = (category: string) => {
    const idx = categories.indexOf(category) - 1;
    return CATEGORY_COLOR_PALETTE[idx % CATEGORY_COLOR_PALETTE.length] ?? CATEGORY_COLOR_PALETTE[0];
  };

  const filtered =
    activeCategory === 'すべて'
      ? qaList
      : qaList.filter((q) => q.category === activeCategory);

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
            <button className="hover:text-[#2563EB] transition-colors"><IconBell /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
            <button className="relative hover:text-[#2563EB] transition-colors hidden sm:block">
              <IconCart />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
            </button>
          </div>
        </div>
      </header>

      {/* ボトムナビ（モバイル） */}
      <BottomNav active="qa" navVisibility={navVisibility} />

      {/* ボディ */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 gap-6 sm:gap-8">

        {/* サイドバー（デスクトップ） */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <PatientSidebarNav active="qa" navVisibility={navVisibility}>
              <div className="my-2 h-px bg-gray-100" />
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-400"><IconLogout /></span>
                ログアウト
              </Link>
            </PatientSidebarNav>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col gap-5 min-w-0">

          {/* ページタイトル */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#EFF6FF] rounded-xl flex items-center justify-center text-[#2563EB]">
                <IconQA />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">よくあるご質問</h1>
                <p className="text-xs text-gray-400 mt-0.5">お気軽にご確認ください</p>
              </div>
              <span className="ml-auto text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
                全{qaList.length}件
              </span>
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
                      {qaList.filter((q) => q.category === cat).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* アコーディオンQ&A */}
          <div className="flex flex-col gap-2">
            {loaded && qaList.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">
                Q&amp;Aはまだ登録されていません。
              </div>
            )}
            {filtered.map((item) => {
              const isOpen = openIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-start gap-3 px-4 sm:px-5 py-4 sm:py-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      Q
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-gray-800 leading-snug break-all">{item.question}</p>
                      {!isOpen && (
                        <span className={`inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${categoryColor(item.category)}`}>
                          {item.category}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 mt-0.5">
                      <IconChevron open={isOpen} />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                          A
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 leading-relaxed break-all">{item.answer}</p>
                          <span className={`inline-block mt-3 text-[11px] font-medium px-2 py-0.5 rounded-full ${categoryColor(item.category)}`}>
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* お問い合わせ誘導 */}
          <div className="bg-[#EFF6FF] rounded-2xl border border-blue-100 p-5 flex flex-col gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold text-gray-800">解決しない場合はお気軽にご連絡ください</p>
              <p className="text-xs text-gray-500 mt-1">スタッフが丁寧にご案内いたします</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="tel:03-xxxx-xxxx"
                className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-3 rounded-xl hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                お電話
              </a>
            </div>
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
        </div>
      </footer>

    </div>
  );
}
