import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sendPatientEmail } from '@/lib/email/sendEmail';
import type { Webinar } from '@/lib/supabase/types';

export async function notifyClinicsAboutWebinar(webinar: Webinar) {
  const session = webinar.sessions[0];
  if (!session) return;
  const { data, error } = await getSupabaseServerClient()
    .rpc('get_webinar_selected_recipients', {
      p_webinar_id: webinar.id,
    });
  if (error) throw error;
  const recipients = (data ?? []) as { contact_id: string; contact_name: string; email: string }[];
  const starts = new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'long', timeStyle: 'short', timeZone: session.timezone,
  }).format(new Date(session.starts_at));
  const provider = session.provider === 'google_meet' ? 'Google Meet' : 'Zoom';
  const results = await Promise.allSettled(recipients.map((recipient) => sendPatientEmail({
    to: recipient.email,
    senderName: 'BioGaia Japan',
    subject: `【ウェビナー】${webinar.title}`,
    text: `${recipient.contact_name} 様\n\n${webinar.title}\n\n開催日時: ${starts}\n配信: ${provider}\n参加URL: ${session.join_url}\n\n${webinar.description ?? ''}`,
  })));
  results.forEach((result) => { if (result.status === 'rejected') console.error('Webinar notification failed:', result.reason); });
}
