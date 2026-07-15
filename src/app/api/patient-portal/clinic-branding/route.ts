import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_BRANDING_COLUMNS } from '@/lib/supabase/types';
import { resolveEffectiveCustomerCode } from '@/lib/auth/patientScope';

export const dynamic = 'force-dynamic';

// ログイン後の患者ポータル各ページ向け。実患者セッション、または
// スタッフのプレビューモードから、表示すべきクリニックの表示名を解決する。
export async function GET() {
  const session = await auth();
  const supabase = getSupabaseServerClient();
  const customerCode = await resolveEffectiveCustomerCode(supabase, session);

  if (!customerCode) {
    return NextResponse.json({ displayName: null, backgroundUrl: null });
  }

  const { data, error } = await supabase
    .from('clinics')
    .select(CLINIC_BRANDING_COLUMNS)
    .eq('customer_code', customerCode)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ displayName: null, backgroundUrl: null });

  return NextResponse.json({
    displayName: data.display_name ?? data.name,
    backgroundUrl: data.patient_background_url,
  });
}
