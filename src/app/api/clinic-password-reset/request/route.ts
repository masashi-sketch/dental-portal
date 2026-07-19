import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { createClinicLoginToken, hasRecentClinicLoginToken } from '@/lib/auth/clinicLoginToken';
import {
  renderEmailTemplate,
  renderEmailTemplateHtml,
  DEFAULT_CLINIC_STAFF_PASSWORD_RESET_SUBJECT,
  DEFAULT_CLINIC_STAFF_PASSWORD_RESET_BODY,
} from '@/lib/email/templates';
import { sendPatientEmail } from '@/lib/email/sendEmail';

export const dynamic = 'force-dynamic';

// 意図的に認証不要（ログインできなくて困っている医院スタッフが使う画面のため）。
// 登録されているメールアドレスかどうかに関わらず常に同じ成功レスポンスを返す
// （メールアドレスの登録有無を外部から探索されないようにするため）。
// 同一スタッフへの再送はhasRecentClinicLoginTokenでクールダウンし、第三者による
// メール爆撃（実在アドレスへの連続送信）を抑止する。
// 患者様向け（/api/password-reset/request）とほぼ同じ実装だが、clinic_usersは
// clinic_email_templatesによる医院ごとのカスタマイズ対象外のため、固定文面
// （DEFAULT_CLINIC_STAFF_PASSWORD_RESET_*）を直接使う。
export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const GENERIC_RESPONSE = { ok: true } as const;

  if (!email) return NextResponse.json(GENERIC_RESPONSE);

  const supabase = getSupabaseServerClient();
  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('id, name, login_id, customer_code, email')
    .eq('email', email)
    .eq('status', '有効')
    .maybeSingle<{ id: string; name: string | null; login_id: string; customer_code: string; email: string }>();

  if (!clinicUser) return NextResponse.json(GENERIC_RESPONSE);
  if (await hasRecentClinicLoginToken(supabase, clinicUser.id, 'password_reset')) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const token = await createClinicLoginToken(supabase, clinicUser.id, 'password_reset');
  const link = `${request.nextUrl.origin}/clinic-reset-password?token=${token}`;

  // メール送信はSMTP接続で数秒かかることがあるため、レスポンス送信後に実行する。
  // 失敗してもリトライはせず、医院スタッフには「届かない場合はBGJ担当者へ」の導線で対応する。
  after(async () => {
    try {
      const { data: clinic } = await supabase
        .from('clinics')
        .select('name')
        .eq('customer_code', clinicUser.customer_code)
        .maybeSingle<{ name: string }>();
      const clinicName = clinic?.name ?? 'デンタルポータル';

      const vars = {
        patientName: clinicUser.name ?? clinicUser.login_id,
        loginId: '',
        clinicName,
        link,
      };
      const subject = renderEmailTemplate(DEFAULT_CLINIC_STAFF_PASSWORD_RESET_SUBJECT, vars);
      const text = renderEmailTemplate(DEFAULT_CLINIC_STAFF_PASSWORD_RESET_BODY, vars);
      const html = renderEmailTemplateHtml(DEFAULT_CLINIC_STAFF_PASSWORD_RESET_BODY, vars);
      await sendPatientEmail({ to: clinicUser.email, senderName: clinicName, subject, text, html });
    } catch (error) {
      console.error('POST /api/clinic-password-reset/request email failed:', error);
    }
  });

  return NextResponse.json(GENERIC_RESPONSE);
}
