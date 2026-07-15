import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { STAFF_AREA_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('staff_areas')
    .select(STAFF_AREA_COLUMNS)
    .order('name', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staffAreas: data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body ?? {};
  if (!name) {
    return NextResponse.json({ error: 'エリア名は必須です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('staff_areas')
    .insert({ name })
    .select(STAFF_AREA_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staffArea: data }, { status: 201 });
}
