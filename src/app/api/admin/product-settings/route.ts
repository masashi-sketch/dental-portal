import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { resolveClinicProductPricing } from '@/lib/productPricing';
import { CLINIC_PRODUCT_SETTING_COLUMNS, CLINIC_TERMS_COLUMNS, PRODUCT_COLUMNS } from '@/lib/supabase/types';
import type { ClinicProductSetting, ClinicTerms, Product } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// 医院用ポータル「商品管理」（/admin/products）用。BGJが公開した商品マスタと、
// 自院の患者ポータル表示設定（clinic_product_settings）をマージして返す。
// 設定行が無い商品は「表示」扱い（デフォルト表示）。
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requested = request.nextUrl.searchParams.get('customerCode');
  const customerCode = await resolveScopedCustomerCode(session, requested);
  if (!customerCode) {
    return NextResponse.json({ error: 'customerCodeが必要です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const [productsResult, settingsResult, termsResult] = await Promise.all([
    supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('status', '公開')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(500),
    supabase
      .from('clinic_product_settings')
      .select(CLINIC_PRODUCT_SETTING_COLUMNS)
      .eq('customer_code', customerCode)
      .limit(500),
    supabase
      .from('clinic_terms')
      .select(CLINIC_TERMS_COLUMNS)
      .eq('customer_code', customerCode)
      .maybeSingle(),
  ]);

  const error = productsResult.error ?? settingsResult.error ?? termsResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settingByProductId = new Map(
    ((settingsResult.data ?? []) as ClinicProductSetting[]).map((setting) => [setting.product_id, setting]),
  );
  const wholesaleRate = (termsResult.data as ClinicTerms | null)?.wholesale_rate ?? null;
  const items = ((productsResult.data ?? []) as Product[]).map((product) => ({
    ...product,
    ...resolveClinicProductPricing(product, settingByProductId.get(product.id), wholesaleRate),
  }));

  return NextResponse.json({ products: items });
}

// 表示/非表示の切り替え。クリニックログイン専用（BGJの代理編集は現状スコープ外。
// /api/admin/clinic-infoのPATCHと同じ方針）。
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'clinic' || !session.user.customerCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { productId, isVisible, clinicPrice, threeMonthPrice, sixMonthPrice } = body ?? {};
  if (typeof productId !== 'string' || !productId || typeof isVisible !== 'boolean'
    || ![clinicPrice, threeMonthPrice, sixMonthPrice].every(
      (price) => Number.isInteger(price) && price >= 0 && price <= 10_000_000,
    )) {
    return NextResponse.json({ error: '商品、医院通常価格、期間別価格、表示設定を正しく指定してください。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_product_settings')
    .upsert(
      {
        customer_code: session.user.customerCode,
        product_id: productId,
        is_visible: isVisible,
        clinic_price: clinicPrice,
        subscription_3_month_price: threeMonthPrice === clinicPrice ? null : threeMonthPrice,
        subscription_6_month_price: sixMonthPrice === clinicPrice ? null : sixMonthPrice,
      },
      { onConflict: 'customer_code,product_id' },
    )
    .select(CLINIC_PRODUCT_SETTING_COLUMNS)
    .single();

  if (error) {
    console.error('PATCH /api/admin/product-settings failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ setting: data });
}
