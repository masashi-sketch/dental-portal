import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_PATIENT_SETTINGS_COLUMNS } from '@/lib/supabase/types';
import { resolveEffectiveCustomerCode } from '@/lib/auth/patientScope';
import { DEFAULT_NAV_VISIBILITY, type NavVisibility } from '@/lib/patientNav';

export const dynamic = 'force-dynamic';

// ログイン後の患者ポータル各ページ向け。実患者セッション、または
// スタッフのプレビューモードから、表示すべきクリニックの表示名・ナビ設定を解決する。
export async function GET() {
  const session = await auth();
  const supabase = getSupabaseServerClient();
  const customerCode = await resolveEffectiveCustomerCode(supabase, session);

  if (!customerCode) {
    return NextResponse.json({ displayName: null, backgroundUrl: null, nav: DEFAULT_NAV_VISIBILITY, showPeriodontalDiagnosis: true });
  }

  const { data, error } = await supabase
    .from('clinics')
    .select(CLINIC_PATIENT_SETTINGS_COLUMNS)
    .eq('customer_code', customerCode)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json({ displayName: null, backgroundUrl: null, nav: DEFAULT_NAV_VISIBILITY, showPeriodontalDiagnosis: true });
  }

  const nav: NavVisibility = {
    home: data.nav_show_home,
    clinicInfo: data.nav_show_clinic_info,
    reservation: data.nav_show_reservation,
    medicalRecord: data.nav_show_medical_record,
    medication: data.nav_show_medication,
    subscription: data.nav_show_subscription,
    shop: data.nav_show_shop,
    qa: data.nav_show_qa,
  };

  return NextResponse.json({
    displayName: data.display_name ?? data.name,
    backgroundUrl: data.patient_background_url,
    nav,
    showPeriodontalDiagnosis: data.show_periodontal_diagnosis,
  });
}
