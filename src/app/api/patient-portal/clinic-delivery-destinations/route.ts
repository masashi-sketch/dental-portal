import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveEffectiveCustomerCode, resolveEffectivePatientId } from '@/lib/auth/patientScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DELIVERY_DESTINATION_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const supabase = getSupabaseServerClient();
  const [patientId, customerCode] = await Promise.all([
    resolveEffectivePatientId(supabase, session),
    resolveEffectiveCustomerCode(supabase, session),
  ]);
  if (!patientId || !customerCode) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('delivery_destinations')
    .select(DELIVERY_DESTINATION_COLUMNS)
    .eq('clinic_customer_code', customerCode)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ destinations: data ?? [] });
}
