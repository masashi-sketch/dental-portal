import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getBgjAggregationSettings } from '@/lib/bgjAggregationSettings';
import { ServerTiming } from '@/lib/serverTiming';

export const dynamic = 'force-dynamic';

// レポート集計対象月数はapp_settingsでBGJが自己管理する（/bgj/system/settings）。
export async function GET() {
  const timing = new ServerTiming();
  const session = await auth();
  timing.mark('auth');
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let settings;
  try {
    settings = await getBgjAggregationSettings();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '集計設定を取得できませんでした。' }, { status: 500 });
  }
  timing.mark('settings');

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_bgj_sales_report', {
    p_months: settings.report_period_months,
  });
  timing.mark('aggregation');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '集計データを取得できませんでした。' }, { status: 500 });

  return NextResponse.json({ report: data }, { headers: { 'Server-Timing': timing.header() } });
}
