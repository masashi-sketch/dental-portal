import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_CONTACT_ROLE_COLUMNS, WEBINAR_WITH_DETAILS_COLUMNS } from '@/lib/supabase/types';
import { parseWebinarDraftInput } from '@/lib/webinars/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseServerClient();
  const [{ data: webinars, error }, { data: clinics, error: clinicError }, { data: contacts, error: contactError }, { data: contactRoles, error: roleError }] = await Promise.all([
    supabase.from('webinars').select(WEBINAR_WITH_DETAILS_COLUMNS).order('updated_at', { ascending: false }).limit(200),
    supabase.from('clinics').select('customer_code, name').order('customer_code').limit(500),
    supabase.from('clinic_contacts').select('id, customer_code, name, email, role_key, status, deleted_at')
      .is('deleted_at', null).order('customer_code').order('name').limit(5000),
    supabase.from('clinic_contact_roles').select(CLINIC_CONTACT_ROLE_COLUMNS).order('sort_order'),
  ]);
  if (error || clinicError || contactError || roleError) return NextResponse.json({ error: (error ?? clinicError ?? contactError ?? roleError)?.message }, { status: 500 });
  return NextResponse.json({ webinars: webinars ?? [], clinics: clinics ?? [], contacts: contacts ?? [], contactRoles: contactRoles ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = parseWebinarDraftInput(await request.json().catch(() => null));
  if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const value = parsed.value;
  const { data, error } = await getSupabaseServerClient().rpc('save_webinar_draft', {
    p_webinar_id: value.id, p_expected_version: value.version, p_title: value.title,
    p_description: value.description, p_provider: value.provider, p_starts_at: value.startsAt,
    p_ends_at: value.endsAt, p_timezone: value.timezone, p_join_url: value.joinUrl,
    p_external_space_id: value.externalSpaceId, p_customer_codes: value.customerCodes,
    p_contact_ids: value.contactIds, p_actor_email: session.user.email,
  });
  if (error) {
    const conflict = error.message.includes('更新競合');
    return NextResponse.json({ error: conflict ? '別の担当者が更新しました。再読み込みしてください。' : 'ウェビナーを保存できませんでした。' }, { status: conflict ? 409 : 500 });
  }
  return NextResponse.json({ id: data }, { status: value.id ? 200 : 201 });
}
