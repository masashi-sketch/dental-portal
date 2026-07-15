import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_VISIT_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_visits')
    .select(CLINIC_VISIT_COLUMNS)
    .eq('customer_code', code)
    .order('visit_date', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ visits: data });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const body = await request.json();
  const { visitDate, purpose, memo, nextVisitDate } = body ?? {};
  if (!purpose) {
    return NextResponse.json({ error: '訪問目的は必須です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_visits')
    .insert({
      customer_code: code,
      visit_date: visitDate || undefined,
      purpose,
      memo: memo || null,
      next_visit_date: nextVisitDate || null,
      created_by: session.user.email,
    })
    .select(CLINIC_VISIT_COLUMNS)
    .single();

  if (error) {
    console.error('POST /api/bgj/clinics/[code]/visits failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ visit: data }, { status: 201 });
}
