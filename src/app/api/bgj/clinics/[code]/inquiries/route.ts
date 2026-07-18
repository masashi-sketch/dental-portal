import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_INQUIRY_COLUMNS, CLINIC_INQUIRY_REPLY_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// 得意先詳細「行動履歴」タブ用。問い合わせに返信一覧をネストして返す。
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const supabase = getSupabaseServerClient();

  const { data: inquiries, error: inquiriesError } = await supabase
    .from('clinic_inquiries')
    .select(CLINIC_INQUIRY_COLUMNS)
    .eq('customer_code', code)
    .order('created_at', { ascending: false })
    .limit(100);

  if (inquiriesError) return NextResponse.json({ error: inquiriesError.message }, { status: 500 });

  const ids = (inquiries ?? []).map((i) => i.id);
  let replies: { inquiry_id: string }[] = [];
  if (ids.length > 0) {
    const { data, error: repliesError } = await supabase
      .from('clinic_inquiry_replies')
      .select(CLINIC_INQUIRY_REPLY_COLUMNS)
      .in('inquiry_id', ids)
      .order('created_at', { ascending: true });
    if (repliesError) return NextResponse.json({ error: repliesError.message }, { status: 500 });
    replies = data ?? [];
  }

  const withReplies = (inquiries ?? []).map((inquiry) => ({
    ...inquiry,
    replies: replies.filter((r) => r.inquiry_id === inquiry.id),
  }));

  return NextResponse.json({ inquiries: withReplies });
}
