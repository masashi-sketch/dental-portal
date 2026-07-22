import { describe, expect, it } from 'vitest';
import { calculateWholesalePrice, resolveClinicProductPricing } from './productPricing';

describe('calculateWholesalePrice', () => {
  it('基準価格に仕切値率を掛けて1円単位に四捨五入する', () => {
    expect(calculateWholesalePrice(4309, 60)).toBe(2585);
  });

  it('契約情報が無い場合は未設定を返す', () => {
    expect(calculateWholesalePrice(4309, null)).toBeNull();
  });
});

describe('resolveClinicProductPricing', () => {
  it('医院価格未設定時は基準価格を通常・期間別価格にする', () => {
    expect(resolveClinicProductPricing({ price: 4309 }, undefined, 60)).toEqual({
      isVisible: true,
      basePrice: 4309,
      wholesaleRate: 60,
      wholesalePrice: 2585,
      clinicPrice: 4309,
      threeMonthPrice: 4309,
      sixMonthPrice: 4309,
    });
  });

  it('医院通常・期間別価格の上書きと非表示設定を反映する', () => {
    expect(resolveClinicProductPricing(
      { price: 4309 },
      { is_visible: false, clinic_price: 3980, subscription_3_month_price: 3780, subscription_6_month_price: 3580 },
      60,
    )).toMatchObject({ isVisible: false, clinicPrice: 3980, threeMonthPrice: 3780, sixMonthPrice: 3580 });
  });
});
