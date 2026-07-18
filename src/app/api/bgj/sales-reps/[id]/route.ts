import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SALES_REP_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, roleId, areaId, phone, email, photoUrl, slackUserId } = body ?? {};

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (roleId !== undefined) update.role_id = roleId || null;
  if (areaId !== undefined) update.area_id = areaId || null;
  if (phone !== undefined) update.phone = phone;
  if (email !== undefined) update.email = email;
  if (photoUrl !== undefined) update.photo_url = photoUrl;
  if (slackUserId !== undefined) update.slack_user_id = slackUserId || null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('sales_reps')
    .update(update)
    .eq('id', id)
    .select(SALES_REP_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ salesRep: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('sales_reps').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
