import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_QA_COLUMNS } from '@/lib/supabase/types';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

// 医院用ポータル（/admin/qa）とBGJポータル（/bgj/customers/[code]、代理編集）の
// 両方から使う。クリニックログインは自院のcustomerCodeに固定、BGJはcustomerCodeクエリで指定する。
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestedCode = request.nextUrl.searchParams.get('customerCode');
  const customerCode = await resolveScopedCustomerCode(session, requestedCode);
  if (!customerCode) return NextResponse.json({ qa: [] });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_qa')
    .select(CLINIC_QA_COLUMNS)
    .eq('customer_code', customerCode)
    .order('sort_order', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ qa: data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { category, question, answer, status } = body ?? {};
  const customerCode = await resolveScopedCustomerCode(session, body?.customerCode ?? null);
  if (!customerCode || !category || !question || !answer) {
    return NextResponse.json({ error: '必須項目が不足しています。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { count } = await supabase
    .from('clinic_qa')
    .select('id', { count: 'exact', head: true })
    .eq('customer_code', customerCode);

  const { data, error } = await supabase
    .from('clinic_qa')
    .insert({
      customer_code: customerCode,
      category,
      question,
      answer,
      status: status ?? '公開',
      sort_order: count ?? 0,
    })
    .select(CLINIC_QA_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ qa: data }, { status: 201 });
}
