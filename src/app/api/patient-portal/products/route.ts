import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_PRODUCT_SETTING_COLUMNS, PRODUCT_COLUMNS } from '@/lib/supabase/types';
import type { ClinicProductSetting, Product } from '@/lib/supabase/types';
import { resolveEffectiveCustomerCode } from '@/lib/auth/patientScope';
import { resolveClinicProductPricing } from '@/lib/productPricing';

export const dynamic = 'force-dynamic';

// 患者ポータル「おすすめ商品」（/shop・/shop/[id]）向け。BGJが公開した商品のうち、
// 通院先医院が非表示にした商品を除外し、priceを医院価格（未設定なら基準価格）へ
// 置き換えて返す。
// 意図的に一覧のみ（単品取得パラメータは設けない）：詳細ページも同じ一覧から
// findするため、非表示・非公開の商品は直接URLアクセスでも自動的に見つからなくなる。
export async function GET() {
  const session = await auth();
  const supabase = getSupabaseServerClient();
  const customerCode = await resolveEffectiveCustomerCode(supabase, session);

  if (!customerCode) {
    return NextResponse.json({ products: [] });
  }

  const [{ data: products, error: productsError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('status', '公開')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(100),
    supabase
      .from('clinic_product_settings')
      .select(CLINIC_PRODUCT_SETTING_COLUMNS)
      .eq('customer_code', customerCode)
      .limit(500),
  ]);

  if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 });
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

  const settingByProductId = new Map(
    ((settings ?? []) as ClinicProductSetting[]).map((setting) => [setting.product_id, setting]),
  );
  const visible = ((products ?? []) as Product[]).flatMap((product) => {
    const pricing = resolveClinicProductPricing(product, settingByProductId.get(product.id), null);
    return pricing.isVisible ? [{ ...product, price: pricing.clinicPrice }] : [];
  });

  return NextResponse.json({ products: visible });
}
