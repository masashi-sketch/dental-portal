import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_EMAIL_TEMPLATES_COLUMNS } from '@/lib/supabase/types';
import { requireBgjSession } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

// 得意先ごとの患者様向けメール文面のカスタマイズ（BGJ専用、現時点では医院側からの
// 自己編集は未対応）。GETは行が無い場合も空のテンプレート（全項目null）を返す。
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_email_templates')
    .select(CLINIC_EMAIL_TEMPLATES_COLUMNS)
    .eq('customer_code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    template: data ?? {
      customer_code: code,
      sender_name: null,
      welcome_subject: null,
      welcome_body: null,
      password_reset_subject: null,
      password_reset_body: null,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const body = await request.json();
  const { senderName, welcomeSubject, welcomeBody, passwordResetSubject, passwordResetBody } = body ?? {};

  const update: Record<string, unknown> = {};
  // 空文字は「カスタムをやめて共通デフォルト（差出人名はクリニック名）に戻す」としてnullで保存する。
  if (senderName !== undefined) update.sender_name = senderName || null;
  if (welcomeSubject !== undefined) update.welcome_subject = welcomeSubject || null;
  if (welcomeBody !== undefined) update.welcome_body = welcomeBody || null;
  if (passwordResetSubject !== undefined) update.password_reset_subject = passwordResetSubject || null;
  if (passwordResetBody !== undefined) update.password_reset_body = passwordResetBody || null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_email_templates')
    .upsert({ customer_code: code, ...update }, { onConflict: 'customer_code' })
    .select(CLINIC_EMAIL_TEMPLATES_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
