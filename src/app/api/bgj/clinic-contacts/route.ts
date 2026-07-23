import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { BGJ_CLINIC_CONTACT_LIST_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await getSupabaseServerClient()
    .from('clinic_contacts')
    .select(BGJ_CLINIC_CONTACT_LIST_COLUMNS)
    .is('deleted_at', null)
    .order('customer_code', { ascending: true })
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data ?? [] });
}
