import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CLINIC_EMAIL_TEMPLATES_COLUMNS } from '@/lib/supabase/types';
import type { ClinicEmailTemplates } from '@/lib/supabase/types';
import {
  DEFAULT_PASSWORD_RESET_BODY,
  DEFAULT_PASSWORD_RESET_SUBJECT,
  DEFAULT_WELCOME_BODY,
  DEFAULT_WELCOME_SUBJECT,
  renderEmailTemplate,
  renderEmailTemplateHtml,
  type EmailTemplateVars,
} from '@/lib/email/templates';

export type EmailTemplateType = 'welcome' | 'password_reset';

// 得意先のカスタム文面（未設定ならデフォルト）を取得し、実際の値へ置換した
// 差出人名・件名・本文を返す。初回登録メール送信・パスワード再設定メール送信の
// 両方から呼ぶ共通ロジック（発行経路によって挙動が分岐しないようにする）。
export async function resolveClinicEmail(
  supabase: SupabaseClient,
  customerCode: string,
  type: EmailTemplateType,
  vars: EmailTemplateVars,
): Promise<{ senderName: string; subject: string; body: string; htmlBody: string }> {
  const { data } = await supabase
    .from('clinic_email_templates')
    .select(CLINIC_EMAIL_TEMPLATES_COLUMNS)
    .eq('customer_code', customerCode)
    .maybeSingle<ClinicEmailTemplates>();

  const defaults =
    type === 'welcome'
      ? { subject: DEFAULT_WELCOME_SUBJECT, body: DEFAULT_WELCOME_BODY }
      : { subject: DEFAULT_PASSWORD_RESET_SUBJECT, body: DEFAULT_PASSWORD_RESET_BODY };
  const rawSubject = (type === 'welcome' ? data?.welcome_subject : data?.password_reset_subject) || defaults.subject;
  const rawBody = (type === 'welcome' ? data?.welcome_body : data?.password_reset_body) || defaults.body;

  return {
    senderName: data?.sender_name || vars.clinicName,
    subject: renderEmailTemplate(rawSubject, vars),
    body: renderEmailTemplate(rawBody, vars),
    htmlBody: renderEmailTemplateHtml(rawBody, vars),
  };
}
