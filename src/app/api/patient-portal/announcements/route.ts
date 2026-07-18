import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_ANNOUNCEMENT_COLUMNS } from '@/lib/supabase/types';
import { resolveEffectiveCustomerCode } from '@/lib/auth/patientScope';

export const dynamic = 'force-dynamic';

// 患者ポータルのホーム画面（デスクトップ・モバイル両方）向け。公開ステータスの
// 項目のみ、新しい日付順に返す。
export async function GET() {
  const session = await auth();
  const supabase = getSupabaseServerClient();
  const customerCode = await resolveEffectiveCustomerCode(supabase, session);

  if (!customerCode) {
    return NextResponse.json({ announcements: [] });
  }

  const { data, error } = await supabase
    .from('clinic_announcements')
    .select(CLINIC_ANNOUNCEMENT_COLUMNS)
    .eq('customer_code', customerCode)
    .eq('status', '公開')
    .order('announcement_date', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcements: data ?? [] });
}
