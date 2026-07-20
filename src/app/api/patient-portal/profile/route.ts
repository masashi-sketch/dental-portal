import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { resolveEffectivePatientId } from '@/lib/auth/patientScope';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const supabase = getSupabaseServerClient();
  const patientId = await resolveEffectivePatientId(supabase, session);

  if (!patientId) {
    return NextResponse.json({ name: null });
  }

  const { data, error } = await supabase
    .from('patients')
    .select('name')
    .eq('id', patientId)
    .maybeSingle<{ name: string | null }>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ name: data?.name ?? null });
}
