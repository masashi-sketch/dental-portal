import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SALES_REP_COLUMNS, STAFF_AREA_COLUMNS, STAFF_ROLE_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const [
    { data: salesReps, error: salesRepsError },
    { data: roles, error: rolesError },
    { data: areas, error: areasError },
  ] = await Promise.all([
    supabase.from('sales_reps').select(SALES_REP_COLUMNS).order('name', { ascending: true }).limit(200),
    supabase.from('staff_roles').select(STAFF_ROLE_COLUMNS).limit(200),
    supabase.from('staff_areas').select(STAFF_AREA_COLUMNS).limit(200),
  ]);

  if (salesRepsError || rolesError || areasError) {
    return NextResponse.json({ error: (salesRepsError ?? rolesError ?? areasError)?.message }, { status: 500 });
  }

  const roleMap = new Map((roles ?? []).map((r) => [r.id, r]));
  const areaMap = new Map((areas ?? []).map((a) => [a.id, a]));

  const enriched = (salesReps ?? []).map((s) => ({
    ...s,
    role: s.role_id ? roleMap.get(s.role_id) ?? null : null,
    area: s.area_id ? areaMap.get(s.area_id) ?? null : null,
  }));

  return NextResponse.json({ salesReps: enriched });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, roleId, areaId, phone, email, photoUrl, slackUserId } = body ?? {};
  if (!name) {
    return NextResponse.json({ error: '氏名は必須です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('sales_reps')
    .insert({
      name,
      role_id: roleId || null,
      area_id: areaId || null,
      phone: phone || null,
      email: email || null,
      photo_url: photoUrl || null,
      slack_user_id: slackUserId || null,
    })
    .select(SALES_REP_COLUMNS)
    .single();

  if (error) {
    console.error('POST /api/bgj/sales-reps failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ salesRep: data }, { status: 201 });
}
