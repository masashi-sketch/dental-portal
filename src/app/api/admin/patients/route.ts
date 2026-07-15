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
  const customerCode = resolveScopedCustomerCode(session, requestedCode);
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from('patients')
    .select(PATIENT_PUBLIC_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(500);
  if (customerCode) query = query.eq('customer_code', customerCode);

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
  const { name, loginId, password, status } = body ?? {};
  const customerCode = resolveScopedCustomerCode(session, body?.customerCode ?? null);
  if (!customerCode || !name || !loginId || !password) {
    return NextResponse.json({ error: '必須項目が不足しています。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('patients')
    .insert({
      customer_code: customerCode,
      name,
      login_id: loginId,
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
