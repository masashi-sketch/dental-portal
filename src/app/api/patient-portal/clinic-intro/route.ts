import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_INTRO_INFO_COLUMNS, CLINIC_STAFF_COLUMNS } from '@/lib/supabase/types';
import { resolveEffectiveCustomerCode } from '@/lib/auth/patientScope';

export const dynamic = 'force-dynamic';

// ログイン後の患者ポータル「クリニック紹介」（/clinic）向け。
// 実患者セッション、またはスタッフのプレビューモードから、表示すべきクリニックの
// スタッフ紹介・診療時間・アクセス情報を解決する。
export async function GET() {
  const session = await auth();
  const supabase = getSupabaseServerClient();
  const customerCode = await resolveEffectiveCustomerCode(supabase, session);

  if (!customerCode) {
    return NextResponse.json({ info: null, staff: [] });
  }

  const [{ data: info, error: infoError }, { data: staff, error: staffError }] = await Promise.all([
    supabase.from('clinics').select(CLINIC_INTRO_INFO_COLUMNS).eq('customer_code', customerCode).maybeSingle(),
    supabase.from('clinic_staff').select(CLINIC_STAFF_COLUMNS).eq('customer_code', customerCode).order('sort_order', { ascending: true }).limit(100),
  ]);

  if (infoError) return NextResponse.json({ error: infoError.message }, { status: 500 });
  if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 });

  return NextResponse.json({ info: info ?? null, staff: staff ?? [] });
}
