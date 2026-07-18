import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_INQUIRY_REPLY_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// BGJ職員が/bgj/inquiries/[id]で行う返信。author_name/author_emailは
// セッションから自動設定し、クライアントからの指定は信用しない。
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { body: replyBody } = body ?? {};
  if (!replyBody) {
    return NextResponse.json({ error: '返信内容は必須です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_inquiry_replies')
    .insert({
      inquiry_id: id,
      author_name: session.user.name ?? null,
      author_email: session.user.email,
      body: replyBody,
    })
    .select(CLINIC_INQUIRY_REPLY_COLUMNS)
    .single();

  if (error) {
    console.error('POST /api/bgj/inquiries/[id]/replies failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 返信があったことをステータスに反映（未対応→対応中）。既に完了扱いなら変更しない。
  await supabase.from('clinic_inquiries').update({ status: '対応中' }).eq('id', id).eq('status', '未対応');

  return NextResponse.json({ reply: data }, { status: 201 });
}
