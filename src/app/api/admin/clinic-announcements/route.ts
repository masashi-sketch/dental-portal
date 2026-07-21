import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_ANNOUNCEMENT_COLUMNS } from '@/lib/supabase/types';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

// 医院用ポータル（/admin/news）とBGJポータル（/bgj/customers/[code]、代理編集）の
// 両方から使う。クリニックログインは自院のcustomerCodeに固定、BGJはcustomerCodeクエリで指定する。
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestedCode = request.nextUrl.searchParams.get('customerCode');
  const customerCode = await resolveScopedCustomerCode(session, requestedCode);
  if (!customerCode) return NextResponse.json({ announcements: [] });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_announcements')
    .select(CLINIC_ANNOUNCEMENT_COLUMNS)
    .eq('customer_code', customerCode)
    .order('announcement_date', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcements: data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { announcementDate, tag, text, status } = body ?? {};
  const customerCode = await resolveScopedCustomerCode(session, body?.customerCode ?? null);
  if (!customerCode || !text) {
    return NextResponse.json({ error: '必須項目が不足しています。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_announcements')
    .insert({
      customer_code: customerCode,
      announcement_date: announcementDate || undefined,
      tag: tag || undefined,
      text,
      status: status ?? '公開',
    })
    .select(CLINIC_ANNOUNCEMENT_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data }, { status: 201 });
}
