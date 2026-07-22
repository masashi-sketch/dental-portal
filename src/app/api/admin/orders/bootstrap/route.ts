import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';
import { ServerTiming } from '@/lib/serverTiming';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  CLINIC_PRODUCT_SETTING_COLUMNS,
  PATIENT_ORDER_WITH_DETAILS_COLUMNS,
  PATIENT_PUBLIC_COLUMNS,
  PRODUCT_COLUMNS,
} from '@/lib/supabase/types';
import type { ClinicProductSetting, Product } from '@/lib/supabase/types';
import { resolveClinicProductPricing } from '@/lib/productPricing';

export const dynamic = 'force-dynamic';

// 注文画面の初期表示専用。従来は注文・患者・商品設定の3 APIで認証と医院スコープ
// 解決を繰り返していたため、1リクエストへ統合しDB照会だけを並列実行する。
export async function GET(request: NextRequest) {
  const timing = new ServerTiming();
  const session = await auth();
  timing.mark('auth');
  if (!session?.user || session.user.role === 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customerCode = await resolveScopedCustomerCode(
    session,
    request.nextUrl.searchParams.get('customerCode'),
  );
  timing.mark('scope');
  if (!customerCode) {
    return NextResponse.json({ error: 'customerCodeが必要です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const [ordersResult, patientsResult, productsResult, settingsResult] = await Promise.all([
    supabase
      .from('patient_orders')
      .select(PATIENT_ORDER_WITH_DETAILS_COLUMNS)
      .eq('customer_code', customerCode)
      .order('ordered_at', { ascending: false })
      .limit(500),
    supabase
      .from('patients')
      .select(PATIENT_PUBLIC_COLUMNS)
      .eq('customer_code', customerCode)
      .order('created_at', { ascending: false })
      .limit(500),
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
  ]);
  timing.mark('database');

  const error = ordersResult.error ?? patientsResult.error ?? productsResult.error ?? settingsResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settingByProductId = new Map(
    ((settingsResult.data ?? []) as ClinicProductSetting[]).map((setting) => [setting.product_id, setting]),
  );
  const products = ((productsResult.data ?? []) as Product[]).map((product) => ({
    ...product,
    price: resolveClinicProductPricing(product, settingByProductId.get(product.id), null).clinicPrice,
    isVisible: settingByProductId.get(product.id)?.is_visible ?? true,
  }));

  return NextResponse.json(
    {
      orders: ordersResult.data ?? [],
      patients: patientsResult.data ?? [],
      products,
    },
    { headers: { 'Server-Timing': timing.header() } },
  );
}
