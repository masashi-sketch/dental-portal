import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasClinicPermission, resolveScopedCustomerCode } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_CONTACT_ROLE_COLUMNS, CLINIC_CONTACT_WITH_PREFERENCES_COLUMNS, CLINIC_USER_PUBLIC_COLUMNS } from '@/lib/supabase/types';
import { parseClinicContactInput } from '@/lib/clinicContacts/validation';
import { hashPassword } from '@/lib/auth/password';
import { INITIAL_CLINIC_LOGIN_PASSWORD } from '@/lib/clinicContacts/loginDefaults';
import type { ClinicPortalRoleKey } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['bgj', 'clinic'].includes(String(session.user.role))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasClinicPermission(session, 'view_contacts')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const customerCode = await resolveScopedCustomerCode(session, request.nextUrl.searchParams.get('customerCode'));
  if (!customerCode) return NextResponse.json({ contacts: [], clinicUsers: [] });
  const supabase = getSupabaseServerClient();
  const [{ data: contacts, error }, { data: clinicUsers, error: usersError }, { data: contactRoles, error: rolesError }] = await Promise.all([
    supabase.from('clinic_contacts').select(CLINIC_CONTACT_WITH_PREFERENCES_COLUMNS)
      .eq('customer_code', customerCode).is('deleted_at', null)
      .order('is_primary', { ascending: false }).order('created_at', { ascending: true }).limit(100),
    supabase.from('clinic_users').select(CLINIC_USER_PUBLIC_COLUMNS).eq('customer_code', customerCode).order('created_at').limit(100),
    supabase.from('clinic_contact_roles').select(CLINIC_CONTACT_ROLE_COLUMNS).order('sort_order'),
  ]);
  if (error || usersError || rolesError) return NextResponse.json({ error: (error ?? usersError ?? rolesError)?.message }, { status: 500 });
  const userIds = (clinicUsers ?? []).map((user) => user.id);
  const { data: assignments, error: assignmentsError } = userIds.length
    ? await supabase.from('clinic_user_role_assignments').select('clinic_user_id, role_key').in('clinic_user_id', userIds)
    : { data: [], error: null };
  if (assignmentsError) return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
  const roleMap = new Map((assignments ?? []).map((assignment) => [assignment.clinic_user_id, assignment.role_key]));
  return NextResponse.json({ contacts: contacts ?? [], contactRoles: contactRoles ?? [], clinicUsers: (clinicUsers ?? []).map((user) => ({ ...user, role_key: roleMap.get(user.id) ?? 'admin' })) });
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
  const portalRoleKey = body && typeof body === 'object' && ['admin', 'staff', 'viewer'].includes(String((body as Record<string, unknown>).portalRoleKey))
    ? (body as Record<string, unknown>).portalRoleKey as ClinicPortalRoleKey
    : 'staff';
  const actorType = session.user.role === 'bgj' ? 'bgj' : 'clinic';
  const actorIdentifier = session.user.email ?? session.user.customerCode ?? 'unknown';
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_clinic_contact_with_login', {
    p_customer_code: customerCode, p_password_hash: hashPassword(INITIAL_CLINIC_LOGIN_PASSWORD),
    p_portal_role_key: portalRoleKey, p_name: value.name, p_department: value.department,
    p_role_key: value.roleKey, p_email: value.email, p_phone: value.phone, p_is_primary: value.isPrimary,
    p_status: value.status, p_notes: value.notes, p_email_topics: value.emailTopics,
    p_phone_topics: value.phoneTopics, p_actor_type: actorType, p_actor_identifier: actorIdentifier,
  });
  if (error) {
    return NextResponse.json({ error: '担当者を登録できませんでした。' }, { status: 500 });
  }
  const { data: createdContact, error: contactError } = await supabase.from('clinic_contacts')
    .select('clinic_user_id').eq('id', data).single<{ clinic_user_id: string }>();
  if (contactError || !createdContact) return NextResponse.json({ error: '作成した担当者IDを取得できませんでした。' }, { status: 500 });
  const [{ data: clinicUser, error: userError }, { data: assignment }] = await Promise.all([
    supabase.from('clinic_users').select(CLINIC_USER_PUBLIC_COLUMNS).eq('id', createdContact.clinic_user_id).single(),
    supabase.from('clinic_user_role_assignments').select('role_key').eq('clinic_user_id', createdContact.clinic_user_id).single(),
  ]);
  if (userError || !clinicUser) return NextResponse.json({ error: '作成した担当者IDを取得できませんでした。' }, { status: 500 });
  return NextResponse.json({ id: data, clinicUser: { ...clinicUser, role_key: assignment?.role_key ?? portalRoleKey } }, { status: 201 });
}
