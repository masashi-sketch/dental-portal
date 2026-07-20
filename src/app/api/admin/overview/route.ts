import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role === 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customerCode = resolveScopedCustomerCode(
    session,
    request.nextUrl.searchParams.get('customerCode'),
  );
  if (!customerCode) {
    return NextResponse.json({ error: 'customerCodeが必要です。' }, { status: 400 });
  }

  const { data, error } = await getSupabaseServerClient().rpc('get_admin_overview', {
    p_customer_code: customerCode,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '集計データを取得できませんでした。' }, { status: 500 });

  return NextResponse.json({ overview: data });
}
