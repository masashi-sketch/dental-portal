import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  CLINIC_COLUMNS,
  CLINIC_INTRO_INFO_COLUMNS,
  CLINIC_PATIENT_SETTINGS_COLUMNS,
  SALES_REP_COLUMNS,
  STAFF_AREA_COLUMNS,
  STAFF_ROLE_COLUMNS,
} from '@/lib/supabase/types';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';
import { generateSignupPin } from '@/lib/auth/signupPin';

export const dynamic = 'force-dynamic';

// 医院用ポータル（/admin/*）が「今どのクリニックとして見るか」を解決するための
// 読み取り専用API。/api/bgj/* はクリニックログインからアクセス不可のため、
// 自院の名称・担当営業を表示するにはこちらを使う。
// clinic_patient_settings・clinic_intro_infoの内容もclinics本体とマージし、
// 呼び出し側には従来通り1つのフラットなclinicオブジェクトとして返す。
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestedCode = request.nextUrl.searchParams.get('customerCode');
  const code = resolveScopedCustomerCode(session, requestedCode);
  if (!code) return NextResponse.json({ clinic: null });

  const supabase = getSupabaseServerClient();
  const [{ data, error }, { data: settings }, { data: intro }] = await Promise.all([
    supabase.from('clinics').select(CLINIC_COLUMNS).eq('customer_code', code).maybeSingle(),
    supabase.from('clinic_patient_settings').select(CLINIC_PATIENT_SETTINGS_COLUMNS).eq('customer_code', code).maybeSingle(),
    supabase.from('clinic_intro_info').select(CLINIC_INTRO_INFO_COLUMNS).eq('customer_code', code).maybeSingle(),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ clinic: null });

  let staff = null;
  if (data.staff_id) {
    const { data: rep } = await supabase.from('sales_reps').select(SALES_REP_COLUMNS).eq('id', data.staff_id).maybeSingle();
    if (rep) {
      const [{ data: role }, { data: area }] = await Promise.all([
        rep.role_id
          ? supabase.from('staff_roles').select(STAFF_ROLE_COLUMNS).eq('id', rep.role_id).maybeSingle()
          : Promise.resolve({ data: null }),
        rep.area_id
          ? supabase.from('staff_areas').select(STAFF_AREA_COLUMNS).eq('id', rep.area_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      staff = { ...rep, role: role ?? null, area: area ?? null };
    }
  }

  return NextResponse.json({ clinic: { ...data, ...settings, ...intro, staff } });
}

// クリニック自身によるブランディング（表示名・背景画像URL）・クリニック紹介の
// 診療時間・アクセス情報・患者ポータル表示設定・歯周病表示の自己編集専用。
// role==='clinic' のセッションのみ許可し、常に自分のcustomerCodeの行だけを更新する
// （bodyのcustomerCodeは一切信用しない）。BGJ側の代理編集は /api/bgj/clinics/[code] を使う。
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'clinic' || !session.user.customerCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const customerCode = session.user.customerCode;

  const body = await request.json();
  const {
    displayName,
    patientBackgroundUrl,
    clinicHoursWeekday,
    clinicHoursSaturday,
    clinicClosedDay,
    clinicPhone,
    clinicAddress,
    clinicNearestStation,
    clinicParking,
    navShowClinicInfo,
    navShowMedicalRecord,
    navShowMedication,
    navShowSubscription,
    navShowShop,
    navShowQa,
    showPeriodontalDiagnosis,
  } = body ?? {};

  // ブランディング・ナビ表示切替・歯周病表示切替はclinic_patient_settingsへ、
  // 診療時間・アクセス情報はclinic_intro_infoへ書き込む。
  const settingsUpdate: Record<string, unknown> = {};
  if (displayName !== undefined) settingsUpdate.display_name = displayName || null;
  if (patientBackgroundUrl !== undefined) settingsUpdate.patient_background_url = patientBackgroundUrl || null;
  if (navShowClinicInfo !== undefined) settingsUpdate.nav_show_clinic_info = navShowClinicInfo;
  if (navShowMedicalRecord !== undefined) settingsUpdate.nav_show_medical_record = navShowMedicalRecord;
  if (navShowMedication !== undefined) settingsUpdate.nav_show_medication = navShowMedication;
  if (navShowSubscription !== undefined) settingsUpdate.nav_show_subscription = navShowSubscription;
  if (navShowShop !== undefined) settingsUpdate.nav_show_shop = navShowShop;
  if (navShowQa !== undefined) settingsUpdate.nav_show_qa = navShowQa;
  if (showPeriodontalDiagnosis !== undefined) settingsUpdate.show_periodontal_diagnosis = showPeriodontalDiagnosis;

  // 患者様の自己登録用（QR + 受付PIN）。医院自身での再発行も許可する。
  if (body?.regenerateSignupPin) {
    settingsUpdate.signup_pin = generateSignupPin();
    settingsUpdate.signup_pin_failed_attempts = 0;
    settingsUpdate.signup_pin_locked_until = null;
  }

  const introUpdate: Record<string, unknown> = {};
  if (clinicHoursWeekday !== undefined) introUpdate.clinic_hours_weekday = clinicHoursWeekday || null;
  if (clinicHoursSaturday !== undefined) introUpdate.clinic_hours_saturday = clinicHoursSaturday || null;
  if (clinicClosedDay !== undefined) introUpdate.clinic_closed_day = clinicClosedDay || null;
  if (clinicPhone !== undefined) introUpdate.clinic_phone = clinicPhone || null;
  if (clinicAddress !== undefined) introUpdate.clinic_address = clinicAddress || null;
  if (clinicNearestStation !== undefined) introUpdate.clinic_nearest_station = clinicNearestStation || null;
  if (clinicParking !== undefined) introUpdate.clinic_parking = clinicParking || null;

  const supabase = getSupabaseServerClient();

  const navColumns = [
    'nav_show_clinic_info',
    'nav_show_medical_record',
    'nav_show_medication',
    'nav_show_subscription',
    'nav_show_shop',
    'nav_show_qa',
  ] as const;
  const touchesNav = navColumns.some((col) => col in settingsUpdate);
  if (touchesNav) {
    const { data: current } = await supabase
      .from('clinic_patient_settings')
      .select(navColumns.join(', '))
      .eq('customer_code', customerCode)
      .maybeSingle<Record<(typeof navColumns)[number], boolean>>();
    const merged = navColumns.map((col) => (col in settingsUpdate ? (settingsUpdate[col] as boolean) : (current?.[col] ?? true)));
    if (merged.every((v) => !v)) {
      return NextResponse.json({ error: '患者ポータルのメニューは、少なくとも1つ表示にする必要があります。' }, { status: 400 });
    }
  }

  const [settingsResult, introResult] = await Promise.all([
    Object.keys(settingsUpdate).length > 0
      ? supabase
          .from('clinic_patient_settings')
          .upsert({ customer_code: customerCode, ...settingsUpdate }, { onConflict: 'customer_code' })
          .select(CLINIC_PATIENT_SETTINGS_COLUMNS)
          .single()
      : Promise.resolve({ data: null, error: null }),
    Object.keys(introUpdate).length > 0
      ? supabase
          .from('clinic_intro_info')
          .upsert({ customer_code: customerCode, ...introUpdate }, { onConflict: 'customer_code' })
          .select(CLINIC_INTRO_INFO_COLUMNS)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (settingsResult.error) return NextResponse.json({ error: settingsResult.error.message }, { status: 500 });
  if (introResult.error) return NextResponse.json({ error: introResult.error.message }, { status: 500 });

  return NextResponse.json({ clinic: { customer_code: customerCode, ...settingsResult.data, ...introResult.data } });
}
