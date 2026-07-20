import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveEffectivePatientId } from '@/lib/auth/patientScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PATIENT_ORDER_WITH_DETAILS_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ orders: [] });
  const supabase = getSupabaseServerClient();
  const patientId = await resolveEffectivePatientId(supabase, session);
  if (!patientId) return NextResponse.json({ orders: [] });

  const { data, error } = await supabase
    .from('patient_orders')
    .select(PATIENT_ORDER_WITH_DETAILS_COLUMNS)
    .eq('patient_id', patientId)
    .order('ordered_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}
