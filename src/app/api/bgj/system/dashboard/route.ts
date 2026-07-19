import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_STATUS_COLUMNS, type ClinicStatusColor } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export type SystemDashboardResponse = {
  clinics: {
    total: number;
    unset: number;
    byStatus: { id: string; name: string; color: ClinicStatusColor; count: number }[];
  };
  clinicUsers: { total: number; active: number; locked: number };
  patients: { total: number; active: number; locked: number; qrRegistered: number };
  inquiries: { open: number };
};

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data: statuses, error: statusesError } = await supabase
    .from('clinic_statuses')
    .select(CLINIC_STATUS_COLUMNS)
    .order('name', { ascending: true })
    .limit(20);

  if (statusesError) {
    return NextResponse.json({ error: statusesError.message }, { status: 500 });
  }

  const [
    clinicTotalRes,
    clinicUnsetRes,
    statusCounts,
    clinicUserTotalRes,
    clinicUserActiveRes,
    clinicUserLockedRes,
    patientTotalRes,
    patientActiveRes,
    patientLockedRes,
    patientQrRes,
    inquiriesOpenRes,
  ] = await Promise.all([
    supabase.from('clinics').select('customer_code', { count: 'exact', head: true }),
    supabase.from('clinics').select('customer_code', { count: 'exact', head: true }).is('status_id', null),
    Promise.all(
      (statuses ?? []).map(async (s) => {
        const { count } = await supabase
          .from('clinics')
          .select('customer_code', { count: 'exact', head: true })
          .eq('status_id', s.id);
        return { id: s.id, name: s.name, color: s.color as ClinicStatusColor, count: count ?? 0 };
      }),
    ),
    supabase.from('clinic_users').select('id', { count: 'exact', head: true }),
    supabase.from('clinic_users').select('id', { count: 'exact', head: true }).eq('status', '有効'),
    supabase.from('clinic_users').select('id', { count: 'exact', head: true }).gt('locked_until', nowIso),
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('status', '有効'),
    supabase.from('patients').select('id', { count: 'exact', head: true }).gt('locked_until', nowIso),
    supabase.from('patients').select('id', { count: 'exact', head: true }).not('email', 'is', null),
    supabase.from('clinic_inquiries').select('id', { count: 'exact', head: true }).eq('status', '未対応'),
  ]);

  const firstError = [
    clinicTotalRes.error,
    clinicUnsetRes.error,
    clinicUserTotalRes.error,
    clinicUserActiveRes.error,
    clinicUserLockedRes.error,
    patientTotalRes.error,
    patientActiveRes.error,
    patientLockedRes.error,
    patientQrRes.error,
    inquiriesOpenRes.error,
  ].find(Boolean);

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const response: SystemDashboardResponse = {
    clinics: {
      total: clinicTotalRes.count ?? 0,
      unset: clinicUnsetRes.count ?? 0,
      byStatus: statusCounts,
    },
    clinicUsers: {
      total: clinicUserTotalRes.count ?? 0,
      active: clinicUserActiveRes.count ?? 0,
      locked: clinicUserLockedRes.count ?? 0,
    },
    patients: {
      total: patientTotalRes.count ?? 0,
      active: patientActiveRes.count ?? 0,
      locked: patientLockedRes.count ?? 0,
      qrRegistered: patientQrRes.count ?? 0,
    },
    inquiries: {
      open: inquiriesOpenRes.count ?? 0,
    },
  };

  return NextResponse.json(response);
}
