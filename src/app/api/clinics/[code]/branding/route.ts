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
  const [{ data: clinic }, { data: settings, error }] = await Promise.all([
    supabase.from('clinics').select('name').eq('customer_code', code).maybeSingle(),
    supabase.from('clinic_patient_settings').select(CLINIC_PATIENT_SETTINGS_COLUMNS).eq('customer_code', code).maybeSingle(),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!settings) {
    return NextResponse.json({ displayName: null, backgroundUrl: null, nav: DEFAULT_NAV_VISIBILITY, showPeriodontalDiagnosis: true });
  }

  const nav: NavVisibility = {
    clinicInfo: settings.nav_show_clinic_info,
    medicalRecord: settings.nav_show_medical_record,
    medication: settings.nav_show_medication,
    subscription: settings.nav_show_subscription,
    shop: settings.nav_show_shop,
    qa: settings.nav_show_qa,
  };

  return NextResponse.json({
    displayName: settings.display_name ?? clinic?.name ?? null,
    backgroundUrl: settings.patient_background_url,
    nav,
    showPeriodontalDiagnosis: settings.show_periodontal_diagnosis,
  });
}
