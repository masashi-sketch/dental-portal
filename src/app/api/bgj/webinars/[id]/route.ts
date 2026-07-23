import { after, NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { WEBINAR_WITH_DETAILS_COLUMNS, type Webinar } from '@/lib/supabase/types';
import { notifyClinicsAboutWebinar } from '@/lib/webinars/notifyClinics';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const status = body?.status;
  const version = Number(body?.version);
  if (!['published', 'canceled'].includes(String(status)) || !Number.isInteger(version) || version < 1) {
    return NextResponse.json({ error: '更新内容が不正です。' }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.rpc('transition_webinar', {
    p_webinar_id: id, p_expected_version: version, p_to_status: status, p_actor_email: session.user.email,
  });
  if (error) {
    const conflict = error.message.includes('更新競合') || error.message.includes('状態遷移');
    return NextResponse.json({ error: conflict ? '別の担当者が更新しました。再読み込みしてください。' : '状態を更新できませんでした。' }, { status: conflict ? 409 : 500 });
  }
  if (status === 'published') {
    after(async () => {
      const { data: webinar, error: loadError } = await getSupabaseServerClient()
        .from('webinars').select(WEBINAR_WITH_DETAILS_COLUMNS).eq('id', id).single();
      if (loadError || !webinar) {
        console.error('Webinar notification data load failed:', loadError);
        return;
      }
      await notifyClinicsAboutWebinar(webinar as unknown as Webinar)
        .catch((notifyError) => console.error('Webinar notifications failed:', notifyError));
    });
  }
  return NextResponse.json({ id, status });
}
