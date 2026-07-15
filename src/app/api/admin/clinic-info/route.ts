import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_COLUMNS, SALES_REP_COLUMNS, STAFF_AREA_COLUMNS, STAFF_ROLE_COLUMNS } from '@/lib/supabase/types';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

// 医院用ポータル（/admin/*）が「今どのクリニックとして見るか」を解決するための
// 読み取り専用API。/api/bgj/* はクリニックログインからアクセス不可のため、
// 自院の名称・担当営業を表示するにはこちらを使う。
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestedCode = request.nextUrl.searchParams.get('customerCode');
  const code = resolveScopedCustomerCode(session, requestedCode);
  if (!code) return NextResponse.json({ clinic: null });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinics')
    .select(CLINIC_COLUMNS)
    .eq('customer_code', code)
    .maybeSingle();

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

  return NextResponse.json({ clinic: { ...data, staff } });
}

// クリニック自身によるブランディング（表示名・背景画像URL）の自己編集専用。
// role==='clinic' のセッションのみ許可し、常に自分のcustomerCodeの行だけを更新する
// （bodyのcustomerCodeは一切信用しない）。BGJ側の代理編集は /api/bgj/clinics/[code] を使う。
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'clinic' || !session.user.customerCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    displayName,
    patientBackgroundUrl,
    navShowHome,
    navShowClinicInfo,
    navShowReservation,
    navShowMedicalRecord,
    navShowMedication,
    navShowSubscription,
    navShowShop,
    navShowQa,
    showPeriodontalDiagnosis,
  } = body ?? {};

  const update: Record<string, unknown> = {};
  if (displayName !== undefined) update.display_name = displayName || null;
  if (patientBackgroundUrl !== undefined) update.patient_background_url = patientBackgroundUrl || null;
  if (navShowHome !== undefined) update.nav_show_home = navShowHome;
  if (navShowClinicInfo !== undefined) update.nav_show_clinic_info = navShowClinicInfo;
  if (navShowReservation !== undefined) update.nav_show_reservation = navShowReservation;
  if (navShowMedicalRecord !== undefined) update.nav_show_medical_record = navShowMedicalRecord;
  if (navShowMedication !== undefined) update.nav_show_medication = navShowMedication;
  if (navShowSubscription !== undefined) update.nav_show_subscription = navShowSubscription;
  if (navShowShop !== undefined) update.nav_show_shop = navShowShop;
  if (navShowQa !== undefined) update.nav_show_qa = navShowQa;
  if (showPeriodontalDiagnosis !== undefined) update.show_periodontal_diagnosis = showPeriodontalDiagnosis;

  const supabase = getSupabaseServerClient();

  const navColumns = [
    'nav_show_home',
    'nav_show_clinic_info',
    'nav_show_reservation',
    'nav_show_medical_record',
    'nav_show_medication',
    'nav_show_subscription',
    'nav_show_shop',
    'nav_show_qa',
  ] as const;
  const touchesNav = navColumns.some((col) => col in update);
  if (touchesNav) {
    const { data: current } = await supabase
      .from('clinics')
      .select(navColumns.join(', '))
      .eq('customer_code', session.user.customerCode)
      .maybeSingle<Record<(typeof navColumns)[number], boolean>>();
    const merged = navColumns.map((col) => (col in update ? (update[col] as boolean) : (current?.[col] ?? true)));
    if (merged.every((v) => !v)) {
      return NextResponse.json({ error: '患者ポータルのメニューは、少なくとも1つ表示にする必要があります。' }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from('clinics')
    .update(update)
    .eq('customer_code', session.user.customerCode)
    .select(CLINIC_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clinic: data });
}
