import type { ClinicProductSetting, Product } from '@/lib/supabase/types';

export type ClinicProductPricing = {
  isVisible: boolean;
  basePrice: number;
  wholesaleRate: number | null;
  wholesalePrice: number | null;
  clinicPrice: number;
  threeMonthPrice: number;
  sixMonthPrice: number;
};

export type PatientProductPricing = Pick<ClinicProductPricing, 'clinicPrice' | 'threeMonthPrice' | 'sixMonthPrice'>;

export function calculateWholesalePrice(basePrice: number, wholesaleRate: number | null): number | null {
  if (wholesaleRate === null) return null;
  return Math.round(basePrice * wholesaleRate / 100);
}

export function resolveClinicProductPricing(
  product: Pick<Product, 'price'>,
  setting: Pick<ClinicProductSetting, 'is_visible' | 'clinic_price' | 'subscription_3_month_price' | 'subscription_6_month_price'> | undefined,
  wholesaleRate: number | null,
): ClinicProductPricing {
  const clinicPrice = setting?.clinic_price ?? product.price;
  return {
    isVisible: setting?.is_visible ?? true,
    basePrice: product.price,
    wholesaleRate,
    wholesalePrice: calculateWholesalePrice(product.price, wholesaleRate),
    clinicPrice,
    threeMonthPrice: setting?.subscription_3_month_price ?? clinicPrice,
    sixMonthPrice: setting?.subscription_6_month_price ?? clinicPrice,
  };
}
