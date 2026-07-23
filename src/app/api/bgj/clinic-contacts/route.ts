import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { BGJ_CLINIC_CONTACT_LIST_COLUMNS, CLINIC_CONTACT_ROLE_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const [{ data, error }, { data: contactRoles, error: rolesError }] = await Promise.all([
    supabase.from('clinic_contacts').select(BGJ_CLINIC_CONTACT_LIST_COLUMNS)
      .is('deleted_at', null)
      .order('customer_code', { ascending: true })
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true })
      .limit(1000),
    supabase.from('clinic_contact_roles').select(CLINIC_CONTACT_ROLE_COLUMNS).order('sort_order'),
  ]);

  if (error || rolesError) return NextResponse.json({ error: (error ?? rolesError)?.message }, { status: 500 });
  return NextResponse.json({ contacts: data ?? [], contactRoles: contactRoles ?? [] });
}
