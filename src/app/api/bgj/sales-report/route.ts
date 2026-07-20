import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// レポート集計対象月数はapp_settingsでBGJが自己管理する（/bgj/system/settings）。
export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data: settings, error: settingsError } = await supabase
    .from('app_settings')
    .select('report_period_months')
    .eq('id', 1)
    .single();
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

  const { data, error } = await supabase.rpc('get_bgj_sales_report', {
    p_months: settings.report_period_months,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '集計データを取得できませんでした。' }, { status: 500 });

  return NextResponse.json({ report: data });
}
