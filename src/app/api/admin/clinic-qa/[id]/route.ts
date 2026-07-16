import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_QA_COLUMNS } from '@/lib/supabase/types';
import { isClinicResourceInScope } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isClinicResourceInScope(supabase, 'clinic_qa', id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const body = await request.json();
  const { category, question, answer, status, sortOrder } = body ?? {};

  const update: Record<string, unknown> = {};
  if (category !== undefined) update.category = category;
  if (question !== undefined) update.question = question;
  if (answer !== undefined) update.answer = answer;
  if (status !== undefined) update.status = status;
  if (sortOrder !== undefined) update.sort_order = sortOrder;

  const { data, error } = await supabase
    .from('clinic_qa')
    .update(update)
    .eq('id', id)
    .select(CLINIC_QA_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ qa: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isClinicResourceInScope(supabase, 'clinic_qa', id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const { error } = await supabase.from('clinic_qa').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
