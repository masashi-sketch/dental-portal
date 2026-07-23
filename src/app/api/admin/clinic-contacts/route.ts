import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasClinicPermission, resolveScopedCustomerCode } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_CONTACT_WITH_PREFERENCES_COLUMNS, CLINIC_USER_PUBLIC_COLUMNS } from '@/lib/supabase/types';
import { parseClinicContactInput } from '@/lib/clinicContacts/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['bgj', 'clinic'].includes(String(session.user.role))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasClinicPermission(session, 'view_contacts')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const customerCode = await resolveScopedCustomerCode(session, request.nextUrl.searchParams.get('customerCode'));
  if (!customerCode) return NextResponse.json({ contacts: [], clinicUsers: [] });
  const supabase = getSupabaseServerClient();
  const [{ data: contacts, error }, { data: clinicUsers, error: usersError }] = await Promise.all([
    supabase.from('clinic_contacts').select(CLINIC_CONTACT_WITH_PREFERENCES_COLUMNS)
      .eq('customer_code', customerCode).is('deleted_at', null)
      .order('is_primary', { ascending: false }).order('created_at', { ascending: true }).limit(100),
    supabase.from('clinic_users').select(CLINIC_USER_PUBLIC_COLUMNS).eq('customer_code', customerCode).order('created_at').limit(100),
  ]);
  if (error || usersError) return NextResponse.json({ error: (error ?? usersError)?.message }, { status: 500 });
  const userIds = (clinicUsers ?? []).map((user) => user.id);
  const { data: assignments, error: assignmentsError } = userIds.length
    ? await supabase.from('clinic_user_role_assignments').select('clinic_user_id, role_key').in('clinic_user_id', userIds)
    : { data: [], error: null };
  if (assignmentsError) return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
  const roleMap = new Map((assignments ?? []).map((assignment) => [assignment.clinic_user_id, assignment.role_key]));
  return NextResponse.json({ contacts: contacts ?? [], clinicUsers: (clinicUsers ?? []).map((user) => ({ ...user, role_key: roleMap.get(user.id) ?? 'admin' })) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['bgj', 'clinic'].includes(String(session.user.role))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasClinicPermission(session, 'manage_contacts')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const requestedCode = body && typeof body === 'object' && typeof (body as Record<string, unknown>).customerCode === 'string'
    ? (body as Record<string, unknown>).customerCode as string
    : null;
  const customerCode = await resolveScopedCustomerCode(session, requestedCode);
  const parsed = parseClinicContactInput(body);
  if (!customerCode || !parsed.value) return NextResponse.json({ error: parsed.error ?? '得意先を特定できません。' }, { status: 400 });
  const value = parsed.value;
  const actorType = session.user.role === 'bgj' ? 'bgj' : 'clinic';
  const actorIdentifier = session.user.email ?? session.user.customerCode ?? 'unknown';
  const { data, error } = await getSupabaseServerClient().rpc('save_clinic_contact', {
    p_contact_id: null, p_expected_version: 1, p_customer_code: customerCode,
    p_clinic_user_id: value.clinicUserId, p_name: value.name, p_department: value.department,
    p_title: value.title, p_email: value.email, p_phone: value.phone, p_is_primary: value.isPrimary,
    p_status: value.status, p_notes: value.notes, p_email_topics: value.emailTopics,
    p_phone_topics: value.phoneTopics, p_actor_type: actorType, p_actor_identifier: actorIdentifier,
  });
  if (error) {
    const duplicate = error.message.includes('clinic_contacts_email_per_clinic') || error.message.includes('clinic_contacts_clinic_user');
    return NextResponse.json({ error: duplicate ? '同じメールアドレスまたは医院ログインが既に登録されています。' : '担当者を登録できませんでした。' }, { status: duplicate ? 409 : 500 });
  }
  return NextResponse.json({ id: data }, { status: 201 });
}
