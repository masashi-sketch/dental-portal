import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_PATIENT_SETTINGS_COLUMNS } from '@/lib/supabase/types';
import { DEFAULT_NAV_VISIBILITY, type NavVisibility } from '@/lib/patientNav';

export const dynamic = 'force-dynamic';

// 意図的に認証不要（患者ポータルのログイン画面＝未認証状態から呼ばれる）。
// 表示名・背景画像URL・ナビ表示設定という非機微な情報だけを返し、
// 住所・電話番号など他の得意先情報は一切含めない。
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinics')
    .select(CLINIC_PATIENT_SETTINGS_COLUMNS)
    .eq('customer_code', code)
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
