import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_USER_PUBLIC_COLUMNS } from '@/lib/supabase/types';
import { hashPassword } from '@/lib/auth/password';
import { requireBgjSession } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginInput(input: { loginId?: unknown; password?: unknown; email?: unknown; status?: unknown }, creating: boolean) {
  const loginId = typeof input.loginId === 'string' ? input.loginId.trim() : undefined;
  const password = typeof input.password === 'string' ? input.password : undefined;
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : undefined;
  if (creating && !loginId) return 'ログインIDは必須です。';
  if (loginId !== undefined && (loginId.length < 3 || loginId.length > 100 || /\s/.test(loginId))) return 'ログインIDは空白を含まない3〜100文字で入力してください。';
  if (creating && !password) return '初期パスワードは必須です。';
  if (password !== undefined && password.length > 0 && (password.length < 8 || password.length > 128)) return 'パスワードは8〜128文字で入力してください。';
  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) return 'メールアドレスの形式が不正です。';
  if (input.status !== undefined && input.status !== '有効' && input.status !== '無効') return '状態が不正です。';
  return null;
}

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
  const validationError = validateLoginInput({ loginId, password, email }, true);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_users')
    .insert({
      customer_code: code,
      login_id: loginId.trim(),
      password_hash: hashPassword(password),
      name: typeof name === 'string' ? name.trim() || null : null,
      email: typeof email === 'string' ? email.trim().toLowerCase() || null : null,
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
  const { id, loginId, password, status, name, email } = body ?? {};
  if (!id) {
    return NextResponse.json({ error: 'idは必須です。' }, { status: 400 });
  }
  const validationError = validateLoginInput({ loginId, password, email, status }, false);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof loginId === 'string') update.login_id = loginId.trim();
  if (password) update.password_hash = hashPassword(password);
  if (status) update.status = status;
  if (name !== undefined) update.name = typeof name === 'string' ? name.trim() || null : null;
  if (email !== undefined) update.email = typeof email === 'string' ? email.trim().toLowerCase() || null : null;
  if (Object.keys(update).length === 0) return NextResponse.json({ error: '更新項目がありません。' }, { status: 400 });

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
