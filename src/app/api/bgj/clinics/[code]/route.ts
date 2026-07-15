import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_COLUMNS, SALES_REP_COLUMNS, STAFF_AREA_COLUMNS, STAFF_ROLE_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
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

const FIELD_MAP: Record<string, string> = {
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(FIELD_MAP)) {
    if (body?.[key] === undefined) continue;
    update[column] = key === 'staffId' ? body[key] || null : body[key];
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinics')
    .update(update)
    .eq('customer_code', code)
    .select(CLINIC_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clinic: data });
}
