import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_ANNOUNCEMENT_COLUMNS } from '@/lib/supabase/types';
import { isClinicResourceInScope } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isClinicResourceInScope(supabase, 'clinic_announcements', id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const body = await request.json();
  const { announcementDate, tag, text, status } = body ?? {};

  const update: Record<string, unknown> = {};
  if (announcementDate !== undefined) update.announcement_date = announcementDate;
  if (tag !== undefined) update.tag = tag;
  if (text !== undefined) update.text = text;
  if (status !== undefined) update.status = status;

  const { data, error } = await supabase
    .from('clinic_announcements')
    .update(update)
    .eq('id', id)
    .select(CLINIC_ANNOUNCEMENT_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isClinicResourceInScope(supabase, 'clinic_announcements', id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const { error } = await supabase.from('clinic_announcements').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
