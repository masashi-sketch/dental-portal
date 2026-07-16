import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_STAFF_COLUMNS } from '@/lib/supabase/types';
import { isClinicResourceInScope } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isClinicResourceInScope(supabase, 'clinic_staff', id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const body = await request.json();
  const { roleLabel, name, credentials, description, photoUrl, sortOrder } = body ?? {};

  const update: Record<string, unknown> = {};
  if (roleLabel !== undefined) update.role_label = roleLabel;
  if (name !== undefined) update.name = name;
  if (credentials !== undefined) update.credentials = credentials || null;
  if (description !== undefined) update.description = description || null;
  if (photoUrl !== undefined) update.photo_url = photoUrl || null;
  if (sortOrder !== undefined) update.sort_order = sortOrder;

  const { data, error } = await supabase
    .from('clinic_staff')
    .update(update)
    .eq('id', id)
    .select(CLINIC_STAFF_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isClinicResourceInScope(supabase, 'clinic_staff', id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const { error } = await supabase.from('clinic_staff').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
