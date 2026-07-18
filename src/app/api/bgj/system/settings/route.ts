import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { APP_SETTINGS_COLUMNS } from '@/lib/supabase/types';

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
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { webhookUrl } = body ?? {};

  // 空欄送信は「変更なし」を意味する。既存値を消したい場合のUIは別途設けない
  // （設定を消す運用は想定していない。誤操作で通知が止まる事故を防ぐため）。
  const update: Record<string, unknown> = { updated_by: session.user.email };
  if (webhookUrl) update.slack_webhook_url = webhookUrl;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('app_settings').update(update).eq('id', 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
