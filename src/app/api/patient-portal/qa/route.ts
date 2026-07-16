import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_QA_COLUMNS } from '@/lib/supabase/types';
import { resolveEffectiveCustomerCode } from '@/lib/auth/patientScope';

export const dynamic = 'force-dynamic';

// ログイン後の患者ポータル「Q&A」（/qa）向け。公開ステータスの項目のみ返す。
export async function GET() {
  const session = await auth();
  const supabase = getSupabaseServerClient();
  const customerCode = await resolveEffectiveCustomerCode(supabase, session);

  if (!customerCode) {
    return NextResponse.json({ qa: [] });
  }

  const { data, error } = await supabase
    .from('clinic_qa')
    .select(CLINIC_QA_COLUMNS)
    .eq('customer_code', customerCode)
    .eq('status', '公開')
    .order('sort_order', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ qa: data ?? [] });
}
