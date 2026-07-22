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
  it('医院価格未設定時は基準価格を患者表示価格にする', () => {
    expect(resolveClinicProductPricing({ price: 4309 }, undefined, 60)).toEqual({
      isVisible: true,
      basePrice: 4309,
      wholesaleRate: 60,
      wholesalePrice: 2585,
      clinicPrice: 4309,
    });
  });

  it('医院価格の上書きと非表示設定を反映する', () => {
    expect(resolveClinicProductPricing(
      { price: 4309 },
      { is_visible: false, clinic_price: 3980 },
      60,
    )).toMatchObject({ isVisible: false, clinicPrice: 3980 });
  });
});
