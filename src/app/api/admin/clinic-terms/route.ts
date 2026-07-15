import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_TERMS_COLUMNS } from '@/lib/supabase/types';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

// 医院用ポータル（/admin/settings）向けの取引条件参照専用API（読み取りのみ）。
// クリニックログインからは/api/bgj/*にアクセスできないため、こちらを使う。
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestedCode = request.nextUrl.searchParams.get('customerCode');
  const code = resolveScopedCustomerCode(session, requestedCode);
  if (!code) return NextResponse.json({ terms: null });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_terms')
    .select(CLINIC_TERMS_COLUMNS)
    .eq('customer_code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ terms: data });
}
