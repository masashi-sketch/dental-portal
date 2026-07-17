import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { consumeLoginToken } from '@/lib/auth/loginToken';
import { hashPassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';

// 意図的に認証不要。トークン自体が本人確認の役割を果たす
// （src/lib/auth/loginToken.ts、使い捨て・30分有効）。
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, password } = body ?? {};

  if (!token || !password) {
    return NextResponse.json({ error: '必須項目が不足しています。' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'パスワードは8文字以上で設定してください。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const result = await consumeLoginToken(supabase, token, 'password_reset');
  if (!result) {
    return NextResponse.json({ error: 'リンクが無効か、期限切れです。もう一度お試しください。' }, { status: 400 });
  }

  const { error } = await supabase
    .from('patients')
    .update({ password_hash: hashPassword(password) })
    .eq('id', result.patientId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
