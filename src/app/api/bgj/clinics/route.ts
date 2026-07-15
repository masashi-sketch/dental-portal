import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_COLUMNS, SALES_REP_COLUMNS, STAFF_AREA_COLUMNS, STAFF_ROLE_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const [
    { data: clinics, error: clinicsError },
    { data: orders, error: ordersError },
    { data: salesReps, error: salesRepsError },
    { data: roles, error: rolesError },
    { data: areas, error: areasError },
  ] = await Promise.all([
    supabase.from('clinics').select(CLINIC_COLUMNS).order('customer_code', { ascending: true }).limit(500),
    supabase
      .from('clinic_orders')
      .select('customer_code, order_date, amount')
      .order('order_date', { ascending: false })
      .limit(1000),
    supabase.from('sales_reps').select(SALES_REP_COLUMNS).limit(200),
    supabase.from('staff_roles').select(STAFF_ROLE_COLUMNS).limit(200),
    supabase.from('staff_areas').select(STAFF_AREA_COLUMNS).limit(200),
  ]);

  if (clinicsError || ordersError || salesRepsError || rolesError || areasError) {
    return NextResponse.json(
      { error: (clinicsError ?? ordersError ?? salesRepsError ?? rolesError ?? areasError)?.message },
      { status: 500 }
    );
  }

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthSalesMap = new Map<string, number>();
  const lastOrderMap = new Map<string, string>();

  for (const o of orders ?? []) {
    if (!lastOrderMap.has(o.customer_code)) lastOrderMap.set(o.customer_code, o.order_date);
    if (o.order_date.slice(0, 7) === currentMonthKey) {
      monthSalesMap.set(o.customer_code, (monthSalesMap.get(o.customer_code) ?? 0) + o.amount);
    }
  }

  const roleMap = new Map((roles ?? []).map((r) => [r.id, r]));
  const areaMap = new Map((areas ?? []).map((a) => [a.id, a]));
  const salesRepMap = new Map(
    (salesReps ?? []).map((r) => [
      r.id,
      { ...r, role: r.role_id ? roleMap.get(r.role_id) ?? null : null, area: r.area_id ? areaMap.get(r.area_id) ?? null : null },
    ])
  );

  const enriched = (clinics ?? []).map((c) => ({
    ...c,
    month_sales: monthSalesMap.get(c.customer_code) ?? 0,
    last_order_date: lastOrderMap.get(c.customer_code) ?? null,
    staff: c.staff_id ? salesRepMap.get(c.staff_id) ?? null : null,
  }));

  return NextResponse.json({ clinics: enriched });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { customerCode, name, area, staffId, status } = body ?? {};
  if (!customerCode || !name || !area) {
    return NextResponse.json({ error: '得意先コード・医院名・エリアは必須です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinics')
    .insert({
      customer_code: customerCode,
      name,
      area,
      staff_id: staffId || null,
      status: status ?? '活性',
    })
    .select(CLINIC_COLUMNS)
    .single();

  if (error) {
    console.error('POST /api/bgj/clinics failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ clinic: data }, { status: 201 });
}
