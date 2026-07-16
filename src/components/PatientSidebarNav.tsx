'use client';

import Link from 'next/link';
import { isPatientNavKeyVisible, type NavVisibility, type PatientNavKey } from '@/lib/patientNav';

// 患者ポータルのデスクトップ用サイドバー（qa/medication/clinic/subscription/shop/home/
// shop/[id]で個別に重複定義されていたnavItems配列とアイコンを共通化したもの。
// ログアウト部分はページごとに実装が微妙に異なる（homeだけsignOut()を呼ぶ等）ため、
// childrenとして各ページに委ねる。

// 各ページで「ページタイトルのアイコン」等サイドバー以外でも再利用されるため、
// すべて名前付きexportにする。
export function IconHome() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
export function IconClinic() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
export function IconFile() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></svg>;
}
export function IconPill() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7Z" /><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" strokeOpacity="0.5" /></svg>;
}
export function IconRefresh() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}
export function IconBag() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
export function IconQA() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}
export function IconLogout() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}

export type PatientSidebarActive = 'home' | PatientNavKey;

const NAV_ITEMS: {
  key: PatientSidebarActive;
  label: string;
  icon: React.ReactNode;
  href: string;
  navKey?: PatientNavKey;
  dividerAfter?: boolean;
}[] = [
  { key: 'home', label: 'ホーム', icon: <IconHome />, href: '/home' },
  { key: 'clinicInfo', label: 'クリニック紹介', icon: <IconClinic />, href: '/clinic', navKey: 'clinicInfo' },
  { key: 'medicalRecord', label: '診療情報', icon: <IconFile />, href: '#', navKey: 'medicalRecord', dividerAfter: true },
  { key: 'medication', label: 'サプリメントの受け取り', icon: <IconPill />, href: '/medication', navKey: 'medication', dividerAfter: true },
  { key: 'subscription', label: '定期購入', icon: <IconRefresh />, href: '/subscription', navKey: 'subscription' },
  { key: 'shop', label: 'おすすめ商品', icon: <IconBag />, href: '/shop', navKey: 'shop' },
  { key: 'qa', label: 'Q & A', icon: <IconQA />, href: '/qa', navKey: 'qa' },
];

export default function PatientSidebarNav({
  active,
  navVisibility,
  children,
}: {
  active: PatientSidebarActive;
  navVisibility: NavVisibility;
  children?: React.ReactNode;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.filter((item) => isPatientNavKeyVisible(item.navKey, navVisibility)).map((item) => {
        const isActive = item.key === active;
        return (
          <div key={item.key}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className={isActive ? 'text-[#2563EB]' : 'text-gray-400'}>{item.icon}</span>
              {item.label}
            </Link>
            {item.dividerAfter && <div className="my-2 h-px bg-gray-100" />}
          </div>
        );
      })}
      {children}
    </nav>
  );
}
