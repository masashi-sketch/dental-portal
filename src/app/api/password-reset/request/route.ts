import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { createLoginToken, hasRecentLoginToken } from '@/lib/auth/loginToken';
import { resolveClinicEmail } from '@/lib/email/resolveClinicEmail';
import { sendPatientEmail } from '@/lib/email/sendEmail';

export const dynamic = 'force-dynamic';

// 意図的に認証不要（ログインできなくて困っている患者様が使う画面のため）。
// 登録されているメールアドレスかどうかに関わらず常に同じ成功レスポンスを返す
// （メールアドレスの登録有無を外部から探索されないようにするため）。
// 同一患者への再送はhasRecentLoginTokenでクールダウンし、第三者による
// メール爆撃（実在アドレスへの連続送信）を抑止する。
export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const GENERIC_RESPONSE = { ok: true } as const;

  if (!email) return NextResponse.json(GENERIC_RESPONSE);

  const supabase = getSupabaseServerClient();
  const { data: patient } = await supabase
    .from('patients')
    .select('id, name, customer_code, email')
    .eq('email', email)
    .eq('status', '有効')
    .maybeSingle<{ id: string; name: string; customer_code: string; email: string }>();

  if (!patient) return NextResponse.json(GENERIC_RESPONSE);
  if (await hasRecentLoginToken(supabase, patient.id, 'password_reset')) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const token = await createLoginToken(supabase, patient.id, 'password_reset');
  const link = `${request.nextUrl.origin}/reset-password?token=${token}`;

  // メール送信はSMTP接続で数秒かかることがあるため、レスポンス送信後に実行する。
  // 失敗してもリトライはせず、患者様には「届かない場合は医院へ」の導線で対応する。
  after(async () => {
    try {
      const { data: clinic } = await supabase
        .from('clinics')
        .select('name')
        .eq('customer_code', patient.customer_code)
        .maybeSingle<{ name: string }>();
      const clinicName = clinic?.name ?? 'デンタルポータル';

      const rendered = await resolveClinicEmail(supabase, patient.customer_code, 'password_reset', {
        patientName: patient.name,
        loginId: '',
        clinicName,
        link,
      });
      await sendPatientEmail({ to: patient.email, senderName: rendered.senderName, subject: rendered.subject, text: rendered.body });
    } catch (error) {
      console.error('POST /api/password-reset/request email failed:', error);
    }
  });

  return NextResponse.json(GENERIC_RESPONSE);
}
