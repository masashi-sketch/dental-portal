import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ダッシュボードのアラート閾値・未発注得意先の扱いはapp_settingsでBGJが自己管理する
// （/bgj/system/settings）。ここで1回だけ読み、集計RPCへそのまま渡す。
export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data: settings, error: settingsError } = await supabase
    .from('app_settings')
    .select('dashboard_followup_days, dashboard_dormant_days, dashboard_include_never_ordered')
    .eq('id', 1)
    .single();
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

  const { data, error } = await supabase.rpc('get_bgj_dashboard_overview', {
    p_followup_days: settings.dashboard_followup_days,
    p_dormant_days: settings.dashboard_dormant_days,
    p_include_never_ordered: settings.dashboard_include_never_ordered,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '集計データを取得できませんでした。' }, { status: 500 });

  return NextResponse.json({ overview: data });
}
