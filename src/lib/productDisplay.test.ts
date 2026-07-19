import { describe, expect, it } from 'vitest';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_BADGE_CLASS,
  PRODUCT_BADGE_COLOR_OPTIONS,
  PRODUCT_IMAGE_TYPE_OPTIONS,
} from './productDisplay';

describe('productDisplay', () => {
  it('カテゴリはDBのCHECK制約と同じ5種（バイオガイア公式サイトの分類）', () => {
    expect(PRODUCT_CATEGORIES).toEqual([
      'お口と喉のケア',
      '赤ちゃん・キッズ',
      '抵抗力サポート',
      '胃腸のサポート',
      'ペット向け',
    ]);
  });

  it('バッジ色マップは全色に静的クラス名を持つ（Tailwindの動的クラス生成を避ける）', () => {
    for (const { value } of PRODUCT_BADGE_COLOR_OPTIONS) {
      expect(PRODUCT_BADGE_CLASS[value]).toMatch(/^bg-\S+ text-\S+$/);
    }
  });

  it('バッジ色の選択肢とクラスマップのキーが一致する', () => {
    expect(PRODUCT_BADGE_COLOR_OPTIONS.map((o) => o.value).sort()).toEqual(
      Object.keys(PRODUCT_BADGE_CLASS).sort(),
    );
  });

  it('image_typeの選択肢はDBのCHECK制約と同じ4種', () => {
    expect(PRODUCT_IMAGE_TYPE_OPTIONS.map((o) => o.value)).toEqual([
      'supplement',
      'yogurt',
      'toothbrush',
      'oral',
    ]);
  });
});
