import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PATIENT_PUBLIC_COLUMNS } from '@/lib/supabase/types';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';
import { hashPassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestedCode = request.nextUrl.searchParams.get('customerCode');
  const customerCode = await resolveScopedCustomerCode(session, requestedCode);
  if (!customerCode) {
    return NextResponse.json({ error: 'customerCodeが必要です。' }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const query = supabase
    .from('patients')
    .select(PATIENT_PUBLIC_COLUMNS)
    .eq('customer_code', customerCode)
    .order('created_at', { ascending: false })
    .limit(500);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ patients: data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, password, status } = body ?? {};
  const customerCode = await resolveScopedCustomerCode(session, body?.customerCode ?? null);
  if (!customerCode || !name || !password) {
    return NextResponse.json({ error: '必須項目が不足しています。' }, { status: 400 });
  }
  // QR自己登録（/api/join/[slug]）と同じ最低文字数ルールに揃える
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'パスワードは8文字以上で設定してください。' }, { status: 400 });
  }

  // login_idは手入力を認めず、patients.login_id（'BU' + 6桁のseq_no連番、
  // schema.sql参照）に自動採番させる。挿入時にこの列を指定するとPostgresが
  // エラーにするため、ここでは一切渡さない。
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('patients')
    .insert({
      customer_code: customerCode,
      name,
      password_hash: hashPassword(password),
      status: status ?? '有効',
    })
    .select(PATIENT_PUBLIC_COLUMNS)
    .single();

  if (error) {
    console.error('POST /api/admin/patients failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ patient: data }, { status: 201 });
}
