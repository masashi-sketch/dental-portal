'use client';

import Link from 'next/link';
import { IconClinic, IconCalendar, IconFile, IconRefresh, IconBag, IconQA, IconLogout } from './icons';
import { SIDE_NAV_ITEMS, NEWS_ITEMS, type SidebarPage } from '../lib/constants';

const ICONS: Record<string, React.ReactNode> = {
  clinic:       <IconClinic />,
  home:         <IconCalendar />,
  records:      <IconFile />,
  subscription: <IconRefresh />,
  shop:         <IconBag />,
  qa:           <IconQA />,
};

interface SidebarProps {
  active: SidebarPage;
  children?: React.ReactNode;
  showNews?: boolean;
}

export default function Sidebar({ active, children, showNews = false }: SidebarProps) {
  return (
    <aside className="hidden md:block w-52 shrink-0">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <nav className="flex flex-col gap-0.5">
          {SIDE_NAV_ITEMS.map((item) => {
            const isActive = item.key === active;
            return (
              <div key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    isActive ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={isActive ? 'text-[#2563EB]' : 'text-gray-400'}>{ICONS[item.key]}</span>
                  {item.label}
                </Link>
                {'dividerAfter' in item && item.dividerAfter && <div className="my-2 h-px bg-gray-100" />}
              </div>
            );
          })}
          <div className="my-2 h-px bg-gray-100" />
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            <span className="text-gray-400"><IconLogout /></span>ログアウト
          </Link>
        </nav>

        {showNews && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-3 px-1">お知らせ</p>
            <div className="flex flex-col gap-1">
              {NEWS_ITEMS.map((n) => (
                <div key={n.text} className="flex flex-col gap-1 py-2 border-b border-gray-50 last:border-0 px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400">{n.date}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${n.tagColor}`}>{n.tag}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-snug">{n.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {children}
      </div>
    </aside>
  );
}
