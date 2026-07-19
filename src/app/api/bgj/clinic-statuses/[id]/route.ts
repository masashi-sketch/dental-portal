import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_STATUS_COLUMNS, type ClinicStatusColor } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

const VALID_COLORS: ClinicStatusColor[] = ['emerald', 'amber', 'red', 'sky', 'violet', 'slate'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
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
    .update({ name, color: color ?? 'slate' })
    .eq('id', id)
    .select(CLINIC_STATUS_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clinicStatus: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('clinic_statuses').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
