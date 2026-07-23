import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { WEBINAR_WITH_DETAILS_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'clinic' || !session.user.customerCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabaseServerClient();
  const { data: targets, error: targetError } = await supabase.from('webinar_target_clinics')
    .select('webinar_id').eq('customer_code', session.user.customerCode);
  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 });
  const webinarIds = (targets ?? []).map((target) => target.webinar_id);
  if (webinarIds.length === 0) return NextResponse.json({ webinars: [] });
  const { data, error } = await supabase.from('webinars')
    .select(WEBINAR_WITH_DETAILS_COLUMNS)
    .eq('status', 'published').in('id', webinarIds)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webinars: data ?? [] });
}
