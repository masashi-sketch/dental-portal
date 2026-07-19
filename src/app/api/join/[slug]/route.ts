import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { hashPassword } from '@/lib/auth/password';
import { isSignupPinLocked, recordFailedSignupPinAttempt, resetSignupPinAttempts } from '@/lib/auth/signupPin';
import { createLoginToken } from '@/lib/auth/loginToken';
import { resolveClinicEmail } from '@/lib/email/resolveClinicEmail';
import { sendPatientEmail } from '@/lib/email/sendEmail';

export const dynamic = 'force-dynamic';

// 意図的に認証不要（患者様ご自身のスマホから、クリニック共通QR経由で
// 初回アクセスする想定のため）。得意先コードは連番で推測可能なため、
// URL・リクエストのいずれにも一切出さず、無関係なランダム文字列である
// signup_slugだけで対象クリニックを解決する。
//
// 【重要な運用方針】ここで受け取る・返す項目は、送信元の
// src/app/join/[slug]/mobile/page.tsx（QRの実際の遷移先）・
// src/app/join/[slug]/page.tsx（PC等での確認用の簡易版）と揃えている。
// 患者様の登録項目を追加・変更する場合は、この3ファイルを必ず連動して更新すること。

async function resolveClinicBySlug(supabase: SupabaseClient, slug: string) {
  return supabase
    .from('clinic_patient_settings')
    .select('customer_code, display_name, patient_background_url, signup_pin, signup_pin_failed_attempts, signup_pin_locked_until')
    .eq('signup_slug', slug)
    .maybeSingle();
}

// 表示名・背景画像URLだけを返す（他のクリニック情報は一切返さない）。
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await resolveClinicBySlug(supabase, slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ displayName: null, backgroundUrl: null });

  const { data: clinic } = await supabase
    .from('clinics')
    .select('name')
    .eq('customer_code', data.customer_code)
    .maybeSingle<{ name: string }>();

  return NextResponse.json({
    displayName: data.display_name ?? clinic?.name ?? null,
    backgroundUrl: data.patient_background_url,
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json();
  const { pin, name, email, password } = body ?? {};

  if (!pin || !name || !email || !password) {
    return NextResponse.json({ error: '必須項目が不足しています。' }, { status: 400 });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'メールアドレスの形式が正しくありません。' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'パスワードは8文字以上で設定してください。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: settings, error: settingsError } = await resolveClinicBySlug(supabase, slug);

  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });
  if (!settings || !settings.signup_pin) {
    return NextResponse.json({ error: 'この登録用QRコードは現在ご利用いただけません。窓口にお尋ねください。' }, { status: 400 });
  }
  const customerCode = settings.customer_code;

  if (isSignupPinLocked(settings.signup_pin_locked_until)) {
    return NextResponse.json({ error: '受付PINの入力に複数回失敗したため、一時的にロックされています。窓口にお尋ねください。' }, { status: 423 });
  }
  if (pin !== settings.signup_pin) {
    await recordFailedSignupPinAttempt(supabase, customerCode, settings.signup_pin_failed_attempts);
    return NextResponse.json({ error: '受付PINが正しくありません。窓口でご確認ください。' }, { status: 401 });
  }
  await resetSignupPinAttempts(supabase, customerCode);

  // login_idは手入力を認めず、patients.login_id（'BU' + 6桁のseq_no連番、
  // schema.sql参照）に自動採番させる。挿入時にこの列を指定するとPostgresが
  // エラーにするため、ここでは一切渡さない。
  const { data: inserted, error } = await supabase
    .from('patients')
    .insert({
      customer_code: customerCode,
      name,
      email,
      password_hash: hashPassword(password),
      status: '有効',
    })
    .select('id, login_id')
    .single();

  if (error) {
    // patients側のunique制約はlogin_id（自動採番で衝突しない）とemailのみのため、
    // ここでの一意制約違反はメールアドレスの重複と判断できる。
    if (error.code === '23505') {
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています。ログイン画面の「パスワードをお忘れの方」もご利用いただけます。' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 初回登録メールの送信はSMTP接続で数秒かかることがあるため、レスポンス送信後に
  // 実行する。失敗しても登録自体は成功済みで、患者様は画面に表示された
  // ログインIDで通常どおりログインできる。
  const origin = request.nextUrl.origin;
  after(async () => {
    try {
      const { data: clinic } = await supabase.from('clinics').select('name').eq('customer_code', customerCode).maybeSingle<{ name: string }>();
      const clinicName = clinic?.name ?? 'デンタルポータル';
      const token = await createLoginToken(supabase, inserted.id, 'first_login');
      const link = `${origin}/join/verify?token=${token}`;
      const rendered = await resolveClinicEmail(supabase, customerCode, 'welcome', {
        patientName: name,
        loginId: inserted.login_id,
        clinicName,
        link,
      });
      await sendPatientEmail({ to: email, senderName: rendered.senderName, subject: rendered.subject, text: rendered.body, html: rendered.htmlBody });
    } catch (emailError) {
      console.error('POST /api/join/[slug] welcome email failed:', emailError);
    }
  });

  return NextResponse.json({ ok: true, loginId: inserted.login_id }, { status: 201 });
}
