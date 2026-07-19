import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_USER_PUBLIC_COLUMNS } from '@/lib/supabase/types';
import { hashPassword } from '@/lib/auth/password';
import { requireBgjSession } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_users')
    .select(CLINIC_USER_PUBLIC_COLUMNS)
    .eq('customer_code', code)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clinicUsers: data });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const body = await request.json();
  const { loginId, password, name, email } = body ?? {};
  if (!loginId || !password) {
    return NextResponse.json({ error: 'ログインID・パスワードは必須です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_users')
    .insert({
      customer_code: code,
      login_id: loginId,
      password_hash: hashPassword(password),
      name: name || null,
      email: email || null,
    })
    .select(CLINIC_USER_PUBLIC_COLUMNS)
    .single();

  if (error) {
    console.error('POST /api/bgj/clinics/[code]/user failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ clinicUser: data }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const body = await request.json();
  const { id, password, status, name, email } = body ?? {};
  if (!id) {
    return NextResponse.json({ error: 'idは必須です。' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (password) update.password_hash = hashPassword(password);
  if (status) update.status = status;
  if (name !== undefined) update.name = name || null;
  if (email !== undefined) update.email = email || null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_users')
    .update(update)
    .eq('id', id)
    .eq('customer_code', code)
    .select(CLINIC_USER_PUBLIC_COLUMNS)
    .single();

  if (error) {
    console.error('PATCH /api/bgj/clinics/[code]/user failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ clinicUser: data });
}
