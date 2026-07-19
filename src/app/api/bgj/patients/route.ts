import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_COLUMNS, PATIENT_BGJ_LIST_COLUMNS, type Clinic, type Patient } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export type BgjPatientListItem = Omit<Patient, 'password_hash' | 'failed_login_attempts'> & {
  clinic_name: string | null;
};

export type BgjPatientsResponse = {
  patients: BgjPatientListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q')?.trim() ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from('patients')
    .select(PATIENT_BGJ_LIST_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (q) {
    const escaped = q.replace(/[%_]/g, (c) => `\\${c}`);
    query = query.or(`name.ilike.%${escaped}%,login_id.ilike.%${escaped}%,patient_no.ilike.%${escaped}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const patients = (data ?? []) as Omit<Patient, 'password_hash' | 'failed_login_attempts'>[];

  const customerCodes = Array.from(new Set(patients.map((p) => p.customer_code)));
  const { data: clinicsData, error: clinicsError } =
    customerCodes.length > 0
      ? await supabase.from('clinics').select(CLINIC_COLUMNS).in('customer_code', customerCodes)
      : { data: [], error: null };

  if (clinicsError) {
    return NextResponse.json({ error: clinicsError.message }, { status: 500 });
  }

  const clinics = (clinicsData ?? []) as Clinic[];
  const clinicNameMap = new Map(clinics.map((c) => [c.customer_code, c.name]));

  const response: BgjPatientsResponse = {
    patients: patients.map((p) => ({ ...p, clinic_name: clinicNameMap.get(p.customer_code) ?? null })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };

  return NextResponse.json(response);
}
