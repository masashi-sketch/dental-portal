export const HEADER_NAV_LINKS = ['クリニック紹介', '診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'] as const;

export type SidebarPage = 'home' | 'clinic' | 'shop' | 'qa' | 'subscription';

export const SIDE_NAV_ITEMS = [
  { label: 'クリニック紹介', key: 'clinic'       as SidebarPage, href: '/clinic' },
  { label: '予約・受診履歴', key: 'home'          as SidebarPage, href: '#' },
  { label: '診療情報',       key: 'records'       as string,      href: '#', dividerAfter: true },
  { label: '定期購入',       key: 'subscription'  as SidebarPage, href: '/subscription' },
  { label: 'おすすめ商品',  key: 'shop'           as SidebarPage, href: '/shop' },
  { label: 'Q & A',          key: 'qa'            as SidebarPage, href: '/qa' },
] as const;

export const NEWS_ITEMS = [
  { date: '2026.06.01', tag: '重要',    tagColor: 'bg-red-50 text-red-500',   text: '夏季休診のご案内（8/13〜8/15）' },
  { date: '2026.05.20', tag: 'お知らせ', tagColor: 'bg-blue-50 text-blue-500', text: '定期購入サービスがリニューアルしました' },
  { date: '2026.05.10', tag: 'お知らせ', tagColor: 'bg-gray-50 text-gray-500', text: '新商品「薬用洗口液 500ml」を追加しました' },
] as const;
