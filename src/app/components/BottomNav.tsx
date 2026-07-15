'use client';

import Link from 'next/link';
import { DEFAULT_NAV_VISIBILITY, isPatientNavKeyVisible, type NavVisibility, type PatientNavKey } from '@/lib/patientNav';

export type BottomNavPage = 'home' | 'clinic' | 'reserve' | 'medication' | 'shop' | 'qa' | 'subscription';

function IconHome({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ) : (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconCalendar({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path fill="white" d="M16 2v4M8 2v4M3 10h18" stroke="white" strokeWidth="2" />
    </svg>
  ) : (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconClinic({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <rect x="9" y="12" width="6" height="10" fill="white" />
    </svg>
  ) : (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
    </svg>
  );
}
function IconBag({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" stroke="white" strokeWidth="2" />
      <path d="M16 10a4 4 0 0 1-8 0" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  ) : (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function IconQA({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ) : (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconPill({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7Z" />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" stroke="white" strokeWidth="2" />
    </svg>
  ) : (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7Z" />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" strokeOpacity="0.5" />
    </svg>
  );
}

const items: { key: BottomNavPage; label: string; href: string; icon: (a: { filled?: boolean }) => React.ReactNode; navKey?: PatientNavKey }[] = [
  { key: 'home',       label: 'ホーム',   href: '/home',       icon: IconHome, navKey: 'home' },
  { key: 'clinic',     label: 'クリニック', href: '/clinic',   icon: IconClinic, navKey: 'clinicInfo' },
  { key: 'reserve',    label: '予約',     href: '#',           icon: IconCalendar, navKey: 'reservation' },
  { key: 'medication', label: 'お薬',     href: '/medication', icon: IconPill, navKey: 'medication' },
  { key: 'shop',       label: '商品',     href: '/shop',       icon: IconBag, navKey: 'shop' },
  { key: 'qa',         label: 'Q & A',    href: '/qa',         icon: IconQA, navKey: 'qa' },
];

export default function BottomNav({ active, navVisibility = DEFAULT_NAV_VISIBILITY }: { active: BottomNavPage; navVisibility?: NavVisibility }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch justify-around px-1" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {items.filter((item) => isPatientNavKeyVisible(item.navKey, navVisibility)).map((item) => {
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 px-3 flex-1 transition-colors ${
                isActive ? 'text-[#2563EB]' : 'text-gray-400'
              }`}
            >
              {item.icon({ filled: isActive })}
              <span className={`text-[10px] font-semibold tracking-tight ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#2563EB] mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
