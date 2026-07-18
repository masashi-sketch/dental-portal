import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_INQUIRY_COLUMNS, CLINIC_INQUIRY_REPLY_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// Slack通知のリンク（/bgj/inquiries/[id]）から遷移してくる問い合わせ詳細。
// 得意先名も合わせて返す（一覧画面を経由せずこのページ単独で開かれるため）。
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: inquiry, error: inquiryError } = await supabase
    .from('clinic_inquiries')
    .select(CLINIC_INQUIRY_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (inquiryError) return NextResponse.json({ error: inquiryError.message }, { status: 500 });
  if (!inquiry) return NextResponse.json({ error: '問い合わせが見つかりません' }, { status: 404 });

  const [{ data: clinic }, { data: replies, error: repliesError }] = await Promise.all([
    supabase.from('clinics').select('name').eq('customer_code', inquiry.customer_code).maybeSingle(),
    supabase
      .from('clinic_inquiry_replies')
      .select(CLINIC_INQUIRY_REPLY_COLUMNS)
      .eq('inquiry_id', id)
      .order('created_at', { ascending: true })
      .limit(200),
  ]);

  if (repliesError) return NextResponse.json({ error: repliesError.message }, { status: 500 });

  return NextResponse.json({
    inquiry: { ...inquiry, clinicName: clinic?.name ?? inquiry.customer_code },
    replies: replies ?? [],
  });
}
