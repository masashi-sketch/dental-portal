import type { ProductBadgeColor, ProductCategory, ProductImageType } from '@/lib/supabase/types';

// 商品マスタの表示用定数。products.badge_color / image_type はTailwindの動的クラス名
// 生成を避けるため固定候補のCHECK制約になっており、ここで静的なクラス名マップに
// 変換する（clinicStatusColors.tsと同じ方式。BGJ商品マスタ・患者ポータルshopで共通利用）。

export const PRODUCT_CATEGORIES: ProductCategory[] = ['サプリメント', 'ヨーグルト', '歯ブラシ', 'オーラルケア'];

export const PRODUCT_BADGE_CLASS: Record<ProductBadgeColor, string> = {
  indigo: 'bg-indigo-100 text-indigo-600',
  rose: 'bg-rose-100 text-rose-600',
  amber: 'bg-amber-100 text-amber-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  sky: 'bg-sky-100 text-sky-600',
  slate: 'bg-slate-100 text-slate-600',
};

export const PRODUCT_BADGE_COLOR_OPTIONS: { value: ProductBadgeColor; label: string }[] = [
  { value: 'indigo', label: '藍（indigo）' },
  { value: 'rose', label: 'ローズ（rose）' },
  { value: 'amber', label: '黄（amber）' },
  { value: 'emerald', label: '緑（emerald）' },
  { value: 'sky', label: '青（sky）' },
  { value: 'slate', label: 'グレー（slate）' },
];

export const PRODUCT_IMAGE_TYPE_OPTIONS: { value: ProductImageType; label: string }[] = [
  { value: 'supplement', label: 'サプリメント（ボトル）' },
  { value: 'yogurt', label: 'ヨーグルト（カップ）' },
  { value: 'toothbrush', label: '歯ブラシ' },
  { value: 'oral', label: 'オーラルケア（チューブ）' },
];
