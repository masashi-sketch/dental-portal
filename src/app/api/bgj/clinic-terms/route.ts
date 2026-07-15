import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_TERMS_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('clinic_terms').select(CLINIC_TERMS_COLUMNS).limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ terms: data });
}
