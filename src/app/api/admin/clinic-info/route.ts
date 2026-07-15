import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_COLUMNS, SALES_REP_COLUMNS, STAFF_AREA_COLUMNS, STAFF_ROLE_COLUMNS } from '@/lib/supabase/types';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

// 医院用ポータル（/admin/*）が「今どのクリニックとして見るか」を解決するための
// 読み取り専用API。/api/bgj/* はクリニックログインからアクセス不可のため、
// 自院の名称・担当営業を表示するにはこちらを使う。
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestedCode = request.nextUrl.searchParams.get('customerCode');
  const code = resolveScopedCustomerCode(session, requestedCode);
  if (!code) return NextResponse.json({ clinic: null });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinics')
    .select(CLINIC_COLUMNS)
    .eq('customer_code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ clinic: null });

  let staff = null;
  if (data.staff_id) {
    const { data: rep } = await supabase.from('sales_reps').select(SALES_REP_COLUMNS).eq('id', data.staff_id).maybeSingle();
    if (rep) {
      const [{ data: role }, { data: area }] = await Promise.all([
        rep.role_id
          ? supabase.from('staff_roles').select(STAFF_ROLE_COLUMNS).eq('id', rep.role_id).maybeSingle()
          : Promise.resolve({ data: null }),
        rep.area_id
          ? supabase.from('staff_areas').select(STAFF_AREA_COLUMNS).eq('id', rep.area_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      staff = { ...rep, role: role ?? null, area: area ?? null };
    }
  }

  return NextResponse.json({ clinic: { ...data, staff } });
}
