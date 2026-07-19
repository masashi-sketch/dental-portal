import type { ProductImageType } from '@/lib/supabase/types';

// 商品のダミー画像（グラデーション＋SVGアイコン）。実画像ファイルは持たず、
// products.image_type のキーで見た目を出し分ける（実画像はPhase 2のShopify同期時に
// image_url列を追加して対応予定）。従来 /shop と /shop/[id] に重複定義されていた
// 描画ロジックの共通化（subscription系ページは意図的にスコープ外で個別実装のまま）。
const CONFIG: Record<ProductImageType, { from: string; to: string; icon: React.ReactNode }> = {
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

export default function ProductVisual({
  type,
  className = 'w-full h-36 sm:h-44 flex items-center justify-center rounded-t-2xl',
}: {
  type: ProductImageType | string;
  className?: string;
}) {
  const c = CONFIG[type as ProductImageType] ?? CONFIG.oral;
  return (
    <div
      data-testid="product-visual"
      className={className}
      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
    >
      {c.icon}
    </div>
  );
}
