import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_INQUIRY_COLUMNS } from '@/lib/supabase/types';
import { postWebhookMessage } from '@/lib/slack/postWebhookMessage';

export const dynamic = 'force-dynamic';

// クリニック自身による問い合わせ送信専用。role==='clinic'のセッションのみ許可し、
// 常に自分のcustomerCodeの行として登録する（bodyのcustomerCodeは一切信用しない、
// src/app/api/admin/clinic-info/route.tsのPATCHと同じ設計）。
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'clinic' || !session.user.customerCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const customerCode = session.user.customerCode;

  const body = await request.json();
  const { subject, body: inquiryBody } = body ?? {};
  if (!subject || !inquiryBody) {
    return NextResponse.json({ error: '件名と本文は必須です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: inquiry, error: insertError } = await supabase
    .from('clinic_inquiries')
    .insert({
      customer_code: customerCode,
      subject,
      body: inquiryBody,
      created_by: session.user.name ?? null,
    })
    .select(CLINIC_INQUIRY_COLUMNS)
    .single();

  if (insertError) {
    console.error('POST /api/admin/inquiries insert failed:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Slack通知はベストエフォート。失敗しても問い合わせ自体の登録は成功として扱う
  // （src/lib/email/sendEmail.tsの呼び出し元と同じ設計思想）。
  await notifySlack(supabase, customerCode, inquiry.id, subject, inquiryBody);

  return NextResponse.json({ inquiry }, { status: 201 });
}

async function notifySlack(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  customerCode: string,
  inquiryId: string,
  subject: string,
  inquiryBody: string,
) {
  try {
    const [{ data: settings }, { data: clinic }] = await Promise.all([
      supabase.from('app_settings').select('slack_webhook_url').eq('id', 1).single(),
      supabase.from('clinics').select('name, staff_id').eq('customer_code', customerCode).maybeSingle(),
    ]);

    if (!settings?.slack_webhook_url) return;

    let staffLine = '（担当者未設定）';
    if (clinic?.staff_id) {
      const { data: staff } = await supabase
        .from('sales_reps')
        .select('name, slack_user_id')
        .eq('id', clinic.staff_id)
        .maybeSingle();
      if (staff) {
        staffLine = staff.slack_user_id ? `<@${staff.slack_user_id}> (${staff.name})` : staff.name;
      }
    }

    const replyUrl = `${process.env.AUTH_URL ?? ''}/bgj/inquiries/${inquiryId}`;
    const text = [
      `【医院名】${clinic?.name ?? customerCode}`,
      `【担当】${staffLine}`,
      '【問い合わせ】',
      `件名: ${subject}`,
      inquiryBody,
      '',
      `返信はこちら → ${replyUrl}`,
    ].join('\n');

    const ok = await postWebhookMessage(settings.slack_webhook_url, text);
    if (ok) {
      await supabase.from('clinic_inquiries').update({ slack_notified_at: new Date().toISOString() }).eq('id', inquiryId);
    }
  } catch (e) {
    console.error('notifySlack failed:', e);
  }
}
