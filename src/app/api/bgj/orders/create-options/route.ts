import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ServerTiming } from '@/lib/serverTiming';
import { CLINIC_PRODUCT_SETTING_COLUMNS } from '@/lib/supabase/types';
import type { ClinicProductSetting } from '@/lib/supabase/types';
import { resolveClinicProductPricing } from '@/lib/productPricing';

export const dynamic = 'force-dynamic';

const CUSTOMER_CODE_PATTERN = /^[A-Z]\d{6}$/;

export async function GET(request: NextRequest) {
  const timing = new ServerTiming();
  const session = await auth();
  timing.mark('auth');
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customerCode = request.nextUrl.searchParams.get('customerCode')?.trim().toUpperCase() ?? '';
  const queryText = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (queryText.length > 100 || (customerCode && !CUSTOMER_CODE_PATTERN.test(customerCode))) {
    return NextResponse.json({ error: '検索条件が不正です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!customerCode) {
    let query = supabase
      .from('clinics')
      .select('customer_code, name')
      .order('customer_code', { ascending: true })
      .limit(50);

    if (queryText) {
      query = /^[A-Za-z]\d{0,6}$/.test(queryText)
        ? query.ilike('customer_code', `${queryText.toUpperCase()}%`)
        : query.ilike('name', `%${queryText.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`);
    }

    const { data, error } = await query;
    timing.mark('clinics_database');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ clinics: data ?? [] }, { headers: { 'Server-Timing': timing.header() } });
  }

  const [clinicResult, patientsResult, productsResult, settingsResult] = await Promise.all([
    supabase.from('clinics').select('customer_code, name').eq('customer_code', customerCode).maybeSingle(),
    supabase
      .from('patients')
      .select('id, customer_code, patient_no, name')
      .eq('customer_code', customerCode)
      .eq('status', '有効')
      .order('patient_no', { ascending: true })
      .limit(500),
    supabase
      .from('products')
      .select('id, name, product_code, price, unit')
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
  timing.mark('options_database');

  const error = clinicResult.error ?? patientsResult.error ?? productsResult.error ?? settingsResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!clinicResult.data) return NextResponse.json({ error: '医院が見つかりません。' }, { status: 404 });

  const settingByProductId = new Map(
    ((settingsResult.data ?? []) as ClinicProductSetting[]).map((setting) => [setting.product_id, setting]),
  );
  const products = (productsResult.data ?? []).flatMap((product) => {
    const pricing = resolveClinicProductPricing(product, settingByProductId.get(product.id), null);
    return pricing.isVisible ? [{ ...product, price: pricing.clinicPrice }] : [];
  });

  return NextResponse.json(
    { clinic: clinicResult.data, patients: patientsResult.data ?? [], products },
    { headers: { 'Server-Timing': timing.header() } },
  );
}
