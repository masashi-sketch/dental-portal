import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PATIENT_PUBLIC_COLUMNS } from '@/lib/supabase/types';
import { isPatientInScope } from '@/lib/auth/clinicScope';
import { hashPassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isPatientInScope(supabase, id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const { data, error } = await supabase.from('patients').select(PATIENT_PUBLIC_COLUMNS).eq('id', id).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ patient: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isPatientInScope(supabase, id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const body = await request.json();
  const { customerCode, name, loginId, password, status } = body ?? {};

  const update: Record<string, unknown> = {};
  // クリニックログインは自院の患者の得意先コードを他院へ付け替えられないようにする
  if (customerCode !== undefined && session.user.role !== 'clinic') update.customer_code = customerCode;
  if (name !== undefined) update.name = name;
  if (loginId !== undefined) update.login_id = loginId;
  // パスワードは指定があった場合のみ再ハッシュ化して更新する（空/未指定なら変更しない）
  if (password) update.password_hash = hashPassword(password);
  if (status !== undefined) update.status = status;

  const { data, error } = await supabase
    .from('patients')
    .update(update)
    .eq('id', id)
    .select(PATIENT_PUBLIC_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ patient: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isPatientInScope(supabase, id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const { error } = await supabase.from('patients').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
