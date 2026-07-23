import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { parseClinicContactInput } from '@/lib/clinicContacts/validation';
import { hasClinicPermission } from '@/lib/auth/clinicScope';

async function scope(id: string, permission: 'view_contacts' | 'manage_contacts' = 'manage_contacts') {
  const session = await auth();
  if (!session?.user || !['bgj', 'clinic'].includes(String(session.user.role))) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!hasClinicPermission(session, permission)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from('clinic_contacts').select('customer_code, clinic_user_id').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!data || (session.user.role === 'clinic' && data.customer_code !== session.user.customerCode)) {
    return { error: NextResponse.json({ error: 'Not Found' }, { status: 404 }) };
  }
  return { session, supabase, customerCode: data.customer_code as string, clinicUserId: data.clinic_user_id as string };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const scoped = await scope(id);
  if ('error' in scoped) return scoped.error;
  const body = await request.json().catch(() => null);
  const parsed = parseClinicContactInput({ ...(body as Record<string, unknown> ?? {}), id });
  if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const value = parsed.value;
  const { data, error } = await scoped.supabase.rpc('save_clinic_contact', {
    p_contact_id: id, p_expected_version: value.version, p_customer_code: scoped.customerCode,
    p_clinic_user_id: scoped.clinicUserId, p_name: value.name, p_department: value.department,
    p_role_key: value.roleKey, p_email: value.email, p_phone: value.phone, p_is_primary: value.isPrimary,
    p_status: value.status, p_notes: value.notes, p_email_topics: value.emailTopics,
    p_phone_topics: value.phoneTopics, p_actor_type: scoped.session.user.role === 'bgj' ? 'bgj' : 'clinic',
    p_actor_identifier: scoped.session.user.email ?? scoped.session.user.customerCode ?? 'unknown',
  });
  if (error) {
    const conflict = error.message.includes('更新競合');
    const duplicate = error.message.includes('clinic_contacts_email_per_clinic');
    return NextResponse.json({ error: conflict ? '別の担当者が更新しました。再読み込みしてください。' : duplicate ? '同じメールアドレスが既に登録されています。' : '担当者を更新できませんでした。' }, { status: conflict ? 409 : duplicate ? 409 : 500 });
  }
  return NextResponse.json({ id: data });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const scoped = await scope(id);
  if ('error' in scoped) return scoped.error;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const version = Number(body?.version);
  if (!Number.isInteger(version) || version < 1) return NextResponse.json({ error: '更新情報が不正です。' }, { status: 400 });
  const { error } = await scoped.supabase.rpc('delete_clinic_contact', {
    p_contact_id: id, p_expected_version: version, p_customer_code: scoped.customerCode,
    p_actor_type: scoped.session.user.role === 'bgj' ? 'bgj' : 'clinic',
    p_actor_identifier: scoped.session.user.email ?? scoped.session.user.customerCode ?? 'unknown',
  });
  if (error) {
    const conflict = error.message.includes('更新競合');
    return NextResponse.json({ error: conflict ? '別の担当者が更新しました。再読み込みしてください。' : '担当者を削除できませんでした。' }, { status: conflict ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}
