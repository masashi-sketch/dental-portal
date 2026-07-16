import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { hashPassword } from '@/lib/auth/password';
import { isSignupPinLocked, recordFailedSignupPinAttempt, resetSignupPinAttempts } from '@/lib/auth/signupPin';

export const dynamic = 'force-dynamic';

// 意図的に認証不要（患者様ご自身のスマホから、クリニック共通QR経由で
// 初回アクセスする想定のため）。受付PINで「窓口にいる本人か」を確認したうえで
// patientsへ新規登録する。得意先コード・氏名・ログインID・パスワード以外の
// クリニック情報は一切返さない。
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await request.json();
  const { pin, name, loginId, password } = body ?? {};

  if (!pin || !name || !loginId || !password) {
    return NextResponse.json({ error: '必須項目が不足しています。' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'パスワードは8文字以上で設定してください。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: settings, error: settingsError } = await supabase
    .from('clinic_patient_settings')
    .select('signup_pin, signup_pin_failed_attempts, signup_pin_locked_until')
    .eq('customer_code', code)
    .maybeSingle();

  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });
  if (!settings || !settings.signup_pin) {
    return NextResponse.json({ error: 'このクリニックは現在、QRコードでの登録を受け付けていません。窓口にお尋ねください。' }, { status: 400 });
  }
  if (isSignupPinLocked(settings.signup_pin_locked_until)) {
    return NextResponse.json({ error: '受付PINの入力に複数回失敗したため、一時的にロックされています。窓口にお尋ねください。' }, { status: 423 });
  }
  if (pin !== settings.signup_pin) {
    await recordFailedSignupPinAttempt(supabase, code, settings.signup_pin_failed_attempts);
    return NextResponse.json({ error: '受付PINが正しくありません。窓口でご確認ください。' }, { status: 401 });
  }
  await resetSignupPinAttempts(supabase, code);

  const { error } = await supabase.from('patients').insert({
    customer_code: code,
    name,
    login_id: loginId,
    password_hash: hashPassword(password),
    status: '有効',
  });

  if (error) {
    const message = error.code === '23505' ? 'そのログインIDは既に使われています。別のIDをお試しください。' : error.message;
    return NextResponse.json({ error: message }, { status: error.code === '23505' ? 409 : 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
