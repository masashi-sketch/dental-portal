import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { hasClinicPermission } from '@/lib/auth/clinicScope';
import { hashPassword } from '@/lib/auth/password';
import { parseClinicLoginInput } from '@/lib/clinicContacts/loginValidation';
import { CLINIC_USER_PUBLIC_COLUMNS } from '@/lib/supabase/types';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !['bgj', 'clinic'].includes(String(session.user.role))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasClinicPermission(session, 'manage_logins')) return NextResponse.json({ error: '担当者ログインを管理する権限がありません。' }, { status: 403 });
  const { id } = await context.params;
  const supabase = getSupabaseServerClient();
  const { data: contact } = await supabase.from('clinic_contacts').select('customer_code, clinic_user_id')
    .eq('id', id).is('deleted_at', null).maybeSingle<{ customer_code: string; clinic_user_id: string | null }>();
  if (!contact || (session.user.role === 'clinic' && contact.customer_code !== session.user.customerCode)) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  const parsed = parseClinicLoginInput(await request.json().catch(() => null), !contact.clinic_user_id);
  if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const value = parsed.value;
  const { data: userId, error } = await supabase.rpc('save_clinic_contact_login', {
    p_contact_id: id, p_customer_code: contact.customer_code, p_login_id: value.loginId,
    p_password_hash: value.password ? hashPassword(value.password) : '', p_email: value.email,
    p_status: value.status, p_role_key: value.roleKey,
    p_actor_type: session.user.role === 'bgj' ? 'bgj' : 'clinic',
    p_actor_identifier: session.user.email ?? session.user.name ?? session.user.customerCode ?? 'unknown',
  });
  if (error) {
    const conflict = error.message.includes('duplicate') || error.message.includes('unique')
      || error.message.includes('clinic_users_login_id_key') || error.message.includes('clinic_users_email_key');
    const lastAdmin = error.message.includes('最後の管理者');
    return NextResponse.json({ error: lastAdmin ? error.message : conflict ? '同じログインIDまたはメールアドレスが既に登録されています。' : 'ログイン情報を保存できませんでした。' }, { status: conflict || lastAdmin ? 409 : 500 });
  }
  const [{ data: clinicUser, error: userError }, { data: assignment }] = await Promise.all([
    supabase.from('clinic_users').select(CLINIC_USER_PUBLIC_COLUMNS).eq('id', userId).single(),
    supabase.from('clinic_user_role_assignments').select('role_key').eq('clinic_user_id', userId).single(),
  ]);
  if (userError) return NextResponse.json({ error: '保存後のログイン情報を取得できませんでした。' }, { status: 500 });
  return NextResponse.json({ clinicUser: { ...clinicUser, role_key: assignment?.role_key ?? value.roleKey } });
}
