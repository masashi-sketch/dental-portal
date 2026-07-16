'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';
import PatientSidebarNav, { IconLogout } from '@/components/PatientSidebarNav';
import PreviewModeBanner from '@/components/PreviewModeBanner';
import { usePatientClinicBranding } from '@/hooks/usePatientClinicBranding';
import type { ClinicStaff } from '@/lib/supabase/types';

/* ── アイコン ── */
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
function IconMapPin() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

const headerNavLinks = ['クリニック紹介', '診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

// DBにはスタッフの色情報を持たせていないため、登録順で巡回して割り当てる。
const STAFF_COLOR_PALETTE = [
  { gradientFrom: '#2563EB', gradientTo: '#60a5fa', activeTab: 'bg-[#2563EB] text-white', inactiveTab: 'bg-[#EFF6FF] text-[#2563EB] hover:bg-[#dbeafe]' },
  { gradientFrom: '#0891b2', gradientTo: '#67e8f9', activeTab: 'bg-[#0891b2] text-white', inactiveTab: 'bg-[#ECFEFF] text-[#0891b2] hover:bg-[#cffafe]' },
  { gradientFrom: '#7c3aed', gradientTo: '#c4b5fd', activeTab: 'bg-[#7c3aed] text-white', inactiveTab: 'bg-[#F5F3FF] text-[#7c3aed] hover:bg-[#ede9fe]' },
] as const;

type ClinicIntroInfo = {
  clinic_hours_weekday: string | null;
  clinic_hours_saturday: string | null;
  clinic_closed_day: string | null;
  clinic_phone: string | null;
  clinic_address: string | null;
  clinic_nearest_station: string | null;
  clinic_parking: string | null;
} | null;

export default function ClinicPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { clinicName, navVisibility } = usePatientClinicBranding();
  const [activeTab, setActiveTab] = useState(0);
  const [staffList, setStaffList] = useState<ClinicStaff[]>([]);
  const [introInfo, setIntroInfo] = useState<ClinicIntroInfo>(null);
  const [introLoaded, setIntroLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/patient-portal/clinic-intro')
      .then((res) => (res.ok ? res.json() : { info: null, staff: [] }))
      .then((data) => {
        if (cancelled) return;
        setIntroInfo(data.info ?? null);
        setStaffList(data.staff ?? []);
      })
      .catch(() => {
        if (!cancelled) { setIntroInfo(null); setStaffList([]); }
      })
      .finally(() => { if (!cancelled) setIntroLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const activeStaff = staffList[activeTab];
  const activeColor = STAFF_COLOR_PALETTE[activeTab % STAFF_COLOR_PALETTE.length];
  const mapAddress = introInfo?.clinic_address || '広島県廿日市市宮内郵便局';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 md:pb-0">

      <PreviewModeBanner />

      {/* 上部アナウンスバー */}
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
            <button className="hover:text-[#2563EB] transition-colors"><IconBell /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
            <button className="relative hover:text-[#2563EB] transition-colors hidden sm:block">
              <IconCart />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
            </button>
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
      <BottomNav active="clinic" navVisibility={navVisibility} />

      {/* ボディ */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 gap-6 sm:gap-8">

        {/* サイドバー（デスクトップ） */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <PatientSidebarNav active="clinicInfo" navVisibility={navVisibility}>
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

          {/* スタッフ紹介カード（タブ切り替え） */}
          {introLoaded && staffList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">
              スタッフ紹介はまだ登録されていません。
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* タブ */}
              <div className="flex gap-2 p-3 bg-gray-50 border-b border-gray-100">
                {staffList.map((staff, i) => (
                  <button
                    key={staff.id}
                    onClick={() => setActiveTab(i)}
                    className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                      activeTab === i ? STAFF_COLOR_PALETTE[i % STAFF_COLOR_PALETTE.length].activeTab : STAFF_COLOR_PALETTE[i % STAFF_COLOR_PALETTE.length].inactiveTab
                    }`}
                  >
                    {staff.role_label}
                  </button>
                ))}
              </div>
              {/* コンテンツ */}
              {activeStaff && (
                <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <div className="flex justify-center sm:justify-start shrink-0">
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex flex-col items-center justify-center shadow-sm gap-0.5"
                      style={{ background: `linear-gradient(to bottom right, ${activeColor.gradientFrom}, ${activeColor.gradientTo})` }}
                    >
                      <svg width="32" height="32" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                      <span className="text-white text-[10px] font-medium opacity-80">{activeStaff.role_label}</span>
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <span className="inline-block bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold px-3 py-0.5 rounded-full mb-2">
                      {activeStaff.role_label}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{activeStaff.name}</h2>
                    {activeStaff.credentials && <p className="text-[#2563EB] text-xs mb-3 break-all">{activeStaff.credentials}</p>}
                    {activeStaff.description && <p className="text-gray-500 text-sm leading-relaxed break-all">{activeStaff.description}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 診療情報 ＋ アクセス */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* 診療内容・診療時間 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-2 text-[#2563EB] font-semibold mb-4 text-sm">
                <IconClock /><span>診療内容・診療時間</span>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm mb-4">
                <tbody className="divide-y divide-gray-50">
                  {[
                    ['一般歯科', '◯◯・◯◯◯◯'],
                    ['予防歯科', 'クリーニング・定期検診'],
                    ['審美歯科', 'ホワイトニング'],
                    ['小児歯科', 'お子様の歯科治療'],
                  ].map(([cat, desc]) => (
                    <tr key={cat}>
                      <td className="py-2.5 text-gray-400 w-20 sm:w-24 text-xs sm:text-sm">{cat}</td>
                      <td className="py-2.5 text-gray-800 font-medium text-xs sm:text-sm">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <div className="border-t border-gray-50 pt-4 space-y-2 text-xs sm:text-sm">
                {[
                  ['平日', introInfo?.clinic_hours_weekday || '未設定'],
                  ['土曜日', introInfo?.clinic_hours_saturday || '未設定'],
                  ['休診日', introInfo?.clinic_closed_day || '未設定'],
                  ['電話番号', introInfo?.clinic_phone || '未設定'],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4">
                    <span className="text-gray-400 w-24 shrink-0">{label}</span>
                    <span className="font-medium text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* アクセス */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col">
              <div className="flex items-center gap-2 text-[#2563EB] font-semibold mb-4 text-sm">
                <IconMapPin /><span>アクセス</span>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                {[
                  ['住所', introInfo?.clinic_address || '未設定'],
                  ['最寄駅', introInfo?.clinic_nearest_station || '未設定'],
                  ['駐車場', introInfo?.clinic_parking || '未設定'],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4">
                    <span className="text-gray-400 w-14 sm:w-16 shrink-0">{label}</span>
                    <span className="text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl overflow-hidden border border-gray-100">
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed&hl=ja&z=16`}
                  width="100%"
                  height="220"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${mapAddress} 地図`}
                />
              </div>
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
