import type { ClinicProductSetting, Product } from '@/lib/supabase/types';

export type ClinicProductPricing = {
  isVisible: boolean;
  basePrice: number;
  wholesaleRate: number | null;
  wholesalePrice: number | null;
  clinicPrice: number;
};

export function calculateWholesalePrice(basePrice: number, wholesaleRate: number | null): number | null {
  if (wholesaleRate === null) return null;
  return Math.round(basePrice * wholesaleRate / 100);
}

export function resolveClinicProductPricing(
  product: Pick<Product, 'price'>,
  setting: Pick<ClinicProductSetting, 'is_visible' | 'clinic_price'> | undefined,
  wholesaleRate: number | null,
): ClinicProductPricing {
  return {
    isVisible: setting?.is_visible ?? true,
    basePrice: product.price,
    wholesaleRate,
    wholesalePrice: calculateWholesalePrice(product.price, wholesaleRate),
    clinicPrice: setting?.clinic_price ?? product.price,
  };
}
