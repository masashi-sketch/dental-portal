import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_STATUS_COLUMNS, type ClinicStatusColor } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

const VALID_COLORS: ClinicStatusColor[] = ['emerald', 'amber', 'red', 'sky', 'violet', 'slate'];

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_statuses')
    .select(CLINIC_STATUS_COLUMNS)
    .order('name', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clinicStatuses: data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, color } = body ?? {};
  if (!name) {
    return NextResponse.json({ error: 'ステータス名は必須です。' }, { status: 400 });
  }
  if (color && !VALID_COLORS.includes(color)) {
    return NextResponse.json({ error: '色の指定が不正です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_statuses')
    .insert({ name, color: color ?? 'slate' })
    .select(CLINIC_STATUS_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clinicStatus: data }, { status: 201 });
}
