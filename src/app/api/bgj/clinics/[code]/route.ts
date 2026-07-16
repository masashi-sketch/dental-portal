import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { generateSignupPin } from '@/lib/auth/signupPin';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CLINIC_COLUMNS,
  CLINIC_INTRO_INFO_COLUMNS,
  CLINIC_PATIENT_SETTINGS_COLUMNS,
  SALES_REP_COLUMNS,
  STAFF_AREA_COLUMNS,
  STAFF_ROLE_COLUMNS,
} from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// clinics（コア情報）・clinic_patient_settings（ブランディング・ナビ表示切替・
// 歯周病表示切替）・clinic_intro_info（診療時間・アクセス）を並列取得し、
// 呼び出し側には従来通り1つのフラットなclinicオブジェクトとして返す。
async function fetchMergedClinic(supabase: SupabaseClient, code: string) {
  const [{ data, error }, { data: settings }, { data: intro }] = await Promise.all([
    supabase.from('clinics').select(CLINIC_COLUMNS).eq('customer_code', code).maybeSingle(),
    supabase.from('clinic_patient_settings').select(CLINIC_PATIENT_SETTINGS_COLUMNS).eq('customer_code', code).maybeSingle(),
    supabase.from('clinic_intro_info').select(CLINIC_INTRO_INFO_COLUMNS).eq('customer_code', code).maybeSingle(),
  ]);

  if (error) return { data: null, error };
  if (!data) return { data: null, error: null };

  return { data: { ...data, ...settings, ...intro }, error: null };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await fetchMergedClinic(supabase, code);

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

const CORE_FIELD_MAP: Record<string, string> = {
  name: 'name',
  area: 'area',
  staffId: 'staff_id',
  status: 'status',
  chairs: 'chairs',
  address: 'address',
  tel: 'tel',
  contactPerson: 'contact_person',
  contractSince: 'contract_since',
  patientType: 'patient_type',
  clinicType: 'clinic_type',
  waitingRoom: 'waiting_room',
  counselingRoom: 'counseling_room',
  closedDay: 'closed_day',
  fullTimeDr: 'full_time_dr',
  partTimeDr: 'part_time_dr',
  hygienist: 'hygienist',
  receptionist: 'receptionist',
  assistant: 'assistant',
  technician: 'technician',
  nurse: 'nurse',
  nutritionist: 'nutritionist',
  childcare: 'childcare',
  mainReferrer: 'main_referrer',
};

const SETTINGS_FIELD_MAP: Record<string, string> = {
  displayName: 'display_name',
  patientBackgroundUrl: 'patient_background_url',
};

const INTRO_FIELD_MAP: Record<string, string> = {
  clinicHoursWeekday: 'clinic_hours_weekday',
  clinicHoursSaturday: 'clinic_hours_saturday',
  clinicClosedDay: 'clinic_closed_day',
  clinicPhone: 'clinic_phone',
  clinicAddress: 'clinic_address',
  clinicNearestStation: 'clinic_nearest_station',
  clinicParking: 'clinic_parking',
};

const NULLABLE_IF_EMPTY = new Set([
  'staffId', 'displayName', 'patientBackgroundUrl',
  'clinicHoursWeekday', 'clinicHoursSaturday', 'clinicClosedDay',
  'clinicPhone', 'clinicAddress', 'clinicNearestStation', 'clinicParking',
]);

function buildUpdate(body: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(fieldMap)) {
    if (body?.[key] === undefined) continue;
    update[column] = NULLABLE_IF_EMPTY.has(key) ? body[key] || null : body[key];
  }
  return update;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const body = await request.json();

  const coreUpdate = buildUpdate(body, CORE_FIELD_MAP);
  const settingsUpdate = buildUpdate(body, SETTINGS_FIELD_MAP);
  const introUpdate = buildUpdate(body, INTRO_FIELD_MAP);

  // 患者様の自己登録用（QR + 受付PIN）。再発行のたびに、それまでの
  // 失敗回数・ロック状態もリセットする。
  if (body?.regenerateSignupPin) {
    settingsUpdate.signup_pin = generateSignupPin();
    settingsUpdate.signup_pin_failed_attempts = 0;
    settingsUpdate.signup_pin_locked_until = null;
  }

  const supabase = getSupabaseServerClient();

  const [coreResult, settingsResult, introResult] = await Promise.all([
    Object.keys(coreUpdate).length > 0
      ? supabase.from('clinics').update(coreUpdate).eq('customer_code', code).select('customer_code').single()
      : Promise.resolve({ error: null }),
    Object.keys(settingsUpdate).length > 0
      ? supabase.from('clinic_patient_settings').upsert({ customer_code: code, ...settingsUpdate }, { onConflict: 'customer_code' }).select('customer_code').single()
      : Promise.resolve({ error: null }),
    Object.keys(introUpdate).length > 0
      ? supabase.from('clinic_intro_info').upsert({ customer_code: code, ...introUpdate }, { onConflict: 'customer_code' }).select('customer_code').single()
      : Promise.resolve({ error: null }),
  ]);

  if (coreResult.error) return NextResponse.json({ error: coreResult.error.message }, { status: 500 });
  if (settingsResult.error) return NextResponse.json({ error: settingsResult.error.message }, { status: 500 });
  if (introResult.error) return NextResponse.json({ error: introResult.error.message }, { status: 500 });

  const { data, error } = await fetchMergedClinic(supabase, code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clinic: data });
}
