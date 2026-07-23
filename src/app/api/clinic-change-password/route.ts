import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hashPassword } from '@/lib/auth/password';
import { INITIAL_CLINIC_LOGIN_PASSWORD } from '@/lib/clinicContacts/loginDefaults';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'clinic' || !session.user.clinicUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.clinicMustChangePassword) {
    return NextResponse.json({ error: '初回パスワード変更は完了しています。' }, { status: 409 });
  }

  const body = await request.json().catch(() => null) as { password?: unknown; confirmation?: unknown } | null;
  const password = typeof body?.password === 'string' ? body.password : '';
  const confirmation = typeof body?.confirmation === 'string' ? body.confirmation : '';
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: '新しいパスワードは8〜128文字で入力してください。' }, { status: 400 });
  }
  if (password === INITIAL_CLINIC_LOGIN_PASSWORD) {
    return NextResponse.json({ error: '初期パスワードとは異なるパスワードを設定してください。' }, { status: 400 });
  }
  if (password !== confirmation) {
    return NextResponse.json({ error: '確認用パスワードが一致しません。' }, { status: 400 });
  }

  const { error } = await getSupabaseServerClient().rpc('complete_initial_clinic_password_change', {
    p_clinic_user_id: session.user.clinicUserId,
    p_password_hash: hashPassword(password),
  });
  if (error) return NextResponse.json({ error: 'パスワードを変更できませんでした。' }, { status: 500 });
  return NextResponse.json({ success: true });
}

