import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isClinicResourceInScope } from '@/lib/auth/clinicScope';
import { canTransitionOrderStatus } from '@/lib/orders';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PATIENT_ORDER_COLUMNS, PATIENT_ORDER_WITH_DETAILS_COLUMNS } from '@/lib/supabase/types';
import type { PatientOrderStatus } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role === 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isClinicResourceInScope(supabase, 'patient_orders', id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const status = (await request.json())?.status as PatientOrderStatus | undefined;
  const allowed = ['received', 'preparing', 'ready', 'shipped', 'completed', 'canceled'];
  if (!status || !allowed.includes(status)) {
    return NextResponse.json({ error: 'ステータスが不正です。' }, { status: 400 });
  }
  const { data: current, error: currentError } = await supabase
    .from('patient_orders')
    .select(PATIENT_ORDER_COLUMNS)
    .eq('id', id)
    .single();
  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 });
  if (!canTransitionOrderStatus(current.status as PatientOrderStatus, status, current.fulfillment_method)) {
    return NextResponse.json({ error: 'このステータスには変更できません。' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('patient_orders')
    .update({ status })
    .eq('id', id)
    .select(PATIENT_ORDER_WITH_DETAILS_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}
