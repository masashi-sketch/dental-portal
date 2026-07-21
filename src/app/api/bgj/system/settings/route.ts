import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { APP_SETTINGS_COLUMNS } from '@/lib/supabase/types';
import { revalidateTag } from 'next/cache';
import { BGJ_AGGREGATION_SETTINGS_TAG } from '@/lib/bgjAggregationSettings';

export const dynamic = 'force-dynamic';

// Webhook URLの生値は返さず、末尾のみ見せて「設定済みの値がこれで合っているか」を
// 確認できるようにする（env-checkの「設定有無の真偽値のみ」よりは情報量を増やすが、
// 生値は返さないという方針は同じ）。
function maskWebhookUrl(url: string): string {
  const tail = url.slice(-6);
  return `...${tail}`;
}

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select(APP_SETTINGS_COLUMNS)
    .eq('id', 1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    configured: !!data.slack_webhook_url,
    webhookUrlPreview: data.slack_webhook_url ? maskWebhookUrl(data.slack_webhook_url) : null,
    dashboardFollowupDays: data.dashboard_followup_days,
    dashboardDormantDays: data.dashboard_dormant_days,
    dashboardIncludeNeverOrdered: data.dashboard_include_never_ordered,
    reportPeriodMonths: data.report_period_months,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { webhookUrl, dashboardFollowupDays, dashboardDormantDays, dashboardIncludeNeverOrdered, reportPeriodMonths } = body ?? {};

  // 空欄送信は「変更なし」を意味する。既存値を消したい場合のUIは別途設けない
  // （設定を消す運用は想定していない。誤操作で通知が止まる事故を防ぐため）。
  const update: Record<string, unknown> = { updated_by: session.user.email };
  if (webhookUrl) update.slack_webhook_url = webhookUrl;

  if (dashboardFollowupDays !== undefined) {
    if (!Number.isInteger(dashboardFollowupDays) || dashboardFollowupDays < 1) {
      return NextResponse.json({ error: '要フォロー閾値は1以上の整数で指定してください。' }, { status: 400 });
    }
    update.dashboard_followup_days = dashboardFollowupDays;
  }
  if (dashboardDormantDays !== undefined) {
    if (!Number.isInteger(dashboardDormantDays) || dashboardDormantDays < 1) {
      return NextResponse.json({ error: '休眠リスク閾値は1以上の整数で指定してください。' }, { status: 400 });
    }
    update.dashboard_dormant_days = dashboardDormantDays;
  }
  if (dashboardIncludeNeverOrdered !== undefined) {
    update.dashboard_include_never_ordered = !!dashboardIncludeNeverOrdered;
  }
  if (reportPeriodMonths !== undefined) {
    if (!Number.isInteger(reportPeriodMonths) || reportPeriodMonths < 1 || reportPeriodMonths > 24) {
      return NextResponse.json({ error: 'レポート集計期間は1〜24ヶ月で指定してください。' }, { status: 400 });
    }
    update.report_period_months = reportPeriodMonths;
  }

  const supabase = getSupabaseServerClient();

  // followup/dormantのどちらか一方だけを更新する場合も、DBのCHECK制約
  // （dormant > followup）を先回りで検証できるよう、未指定側は現在値を読む。
  if (update.dashboard_followup_days !== undefined || update.dashboard_dormant_days !== undefined) {
    const { data: current } = await supabase
      .from('app_settings')
      .select('dashboard_followup_days, dashboard_dormant_days')
      .eq('id', 1)
      .single();
    const followup = (update.dashboard_followup_days as number | undefined) ?? current?.dashboard_followup_days;
    const dormant = (update.dashboard_dormant_days as number | undefined) ?? current?.dashboard_dormant_days;
    if (followup !== undefined && dormant !== undefined && dormant <= followup) {
      return NextResponse.json({ error: '休眠リスク閾値は要フォロー閾値より大きい値にしてください。' }, { status: 400 });
    }
  }

  const { error } = await supabase.from('app_settings').update(update).eq('id', 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag(BGJ_AGGREGATION_SETTINGS_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
