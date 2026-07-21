import { PRODUCT_CATEGORIES, PRODUCT_BADGE_COLOR_OPTIONS, PRODUCT_IMAGE_TYPE_OPTIONS } from '@/lib/productDisplay';

// POST/PATCH共通の入力検証。DBのCHECK制約と同じ候補値をアプリ側でも検証し、
// 素っ気ないPostgresエラーではなく分かりやすいメッセージを返す
// （clinic-statusesのVALID_COLORSと同じ方針）。
const VALID_CATEGORIES: string[] = PRODUCT_CATEGORIES;
const VALID_IMAGE_TYPES: string[] = PRODUCT_IMAGE_TYPE_OPTIONS.map((o) => o.value);
const VALID_BADGE_COLORS: string[] = PRODUCT_BADGE_COLOR_OPTIONS.map((o) => o.value);
const VALID_STATUSES = ['公開', '下書き'];
const VALID_RECOMMENDATION_LEVELS = ['◎', '○'];

type ValidatedRow = Record<string, unknown>;

export function validateProductBody(body: unknown): { row: ValidatedRow } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const category = typeof b.category === 'string' ? b.category : '';
  const price = typeof b.price === 'number' ? b.price : Number(b.price);

  if (!name) return { error: '商品名は必須です。' };
  if (!VALID_CATEGORIES.includes(category)) return { error: 'カテゴリの値が不正です。' };
  if (!Number.isInteger(price) || price < 0) return { error: '価格は0以上の整数で入力してください。' };

  const imageType = typeof b.imageType === 'string' ? b.imageType : 'supplement';
  if (!VALID_IMAGE_TYPES.includes(imageType)) return { error: '画像タイプの値が不正です。' };

  const badgeColor = b.badgeColor ? String(b.badgeColor) : null;
  if (badgeColor && !VALID_BADGE_COLORS.includes(badgeColor)) return { error: 'バッジ色の値が不正です。' };

  const status = typeof b.status === 'string' ? b.status : '下書き';
  if (!VALID_STATUSES.includes(status)) return { error: 'ステータスの値が不正です。' };

  const recommendationLevel = b.recommendationLevel ? String(b.recommendationLevel) : null;
  if (recommendationLevel && !VALID_RECOMMENDATION_LEVELS.includes(recommendationLevel)) {
    return { error: '推奨度の値が不正です。' };
  }

  const sortOrder = b.sortOrder === undefined || b.sortOrder === null || b.sortOrder === '' ? 0 : Number(b.sortOrder);
  if (!Number.isInteger(sortOrder)) return { error: '表示順は整数で入力してください。' };

  const optionalText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  const imageUrl = optionalText(b.imageUrl);
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) return { error: '画像URLの形式が不正です。' };

  return {
    row: {
      name,
      product_code: optionalText(b.productCode),
      category,
      description: optionalText(b.description),
      price,
      unit: optionalText(b.unit),
      image_type: imageType,
      image_url: imageUrl,
      badge: optionalText(b.badge),
      badge_color: badgeColor,
      subscription_available: !!b.subscriptionAvailable,
      volume: optionalText(b.volume),
      ingredients: optionalText(b.ingredients),
      how_to_use: optionalText(b.howToUse),
      caution: optionalText(b.caution),
      working_point: optionalText(b.workingPoint),
      daily_amount: optionalText(b.dailyAmount),
      recommendation_level: recommendationLevel,
      doctor_comment: optionalText(b.doctorComment),
      status,
      sort_order: sortOrder,
    },
  };
}
