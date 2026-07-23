import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sendPatientEmail } from '@/lib/email/sendEmail';
import type { Webinar } from '@/lib/supabase/types';

export async function notifyClinicsAboutWebinar(webinar: Webinar) {
  const session = webinar.sessions[0];
  if (!session) return;
  const codes = webinar.target_clinics.map((target) => target.customer_code);
  // 新しい担当者管理で「ウェビナー・メール」が有効な宛先を優先する。
  // 移行直後に通知が止まらないよう、その医院に設定済み担当者が1人もいない場合だけ
  // 従来の有効なclinic_users.emailへフォールバックする（判定はDB関数内）。
  const { data, error } = await getSupabaseServerClient()
    .rpc('get_webinar_notification_recipients', {
      p_customer_codes: codes,
    });
  if (error) throw error;
  const recipientRows = (data ?? []) as { email: string }[];
  const recipients = [...new Set(recipientRows.map((row) => row.email).filter((email): email is string => !!email))];
  const starts = new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'long', timeStyle: 'short', timeZone: session.timezone,
  }).format(new Date(session.starts_at));
  const provider = session.provider === 'google_meet' ? 'Google Meet' : 'Zoom';
  const text = `${webinar.title}\n\n開催日時: ${starts}\n配信: ${provider}\n参加URL: ${session.join_url}\n\n${webinar.description ?? ''}`;
  const results = await Promise.allSettled(recipients.map((to) => sendPatientEmail({
    to, senderName: 'BioGaia Japan', subject: `【ウェビナー】${webinar.title}`, text,
  })));
  results.forEach((result) => { if (result.status === 'rejected') console.error('Webinar notification failed:', result.reason); });
}
