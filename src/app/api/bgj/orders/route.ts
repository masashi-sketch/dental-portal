import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { toOrderIntegrationRecord, type BgjOrdersResponse } from '@/lib/orderIntegration';
import { ServerTiming } from '@/lib/serverTiming';
import {
  PATIENT_ORDER_WITH_DETAILS_COLUMNS,
  type CommerceSource,
  type CommerceSyncStatus,
  type PatientOrder,
  type PatientOrderStatus,
} from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const ORDER_STATUSES: PatientOrderStatus[] = ['received', 'preparing', 'ready', 'shipped', 'completed', 'canceled'];
const SOURCES: CommerceSource[] = ['internal', 'shopify'];
const SYNC_STATUSES: CommerceSyncStatus[] = ['local', 'pending', 'synced', 'error'];

function readEnum<T extends string>(value: string | null, allowed: readonly T[]): T | null | 'invalid' {
  if (!value) return null;
  return allowed.includes(value as T) ? value as T : 'invalid';
}

export async function GET(request: NextRequest) {
  const timing = new ServerTiming();
  const session = await auth();
  timing.mark('auth');
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const status = readEnum(params.get('status'), ORDER_STATUSES);
  const source = readEnum(params.get('source'), SOURCES);
  const syncStatus = readEnum(params.get('syncStatus'), SYNC_STATUSES);
  const customerCode = params.get('customerCode')?.trim() ?? '';
  const externalOrderId = params.get('externalOrderId')?.trim() ?? '';
  if ([status, source, syncStatus].includes('invalid')) {
    return NextResponse.json({ error: '絞り込み条件が不正です。' }, { status: 400 });
  }
  if ((customerCode && !/^[A-Za-z0-9_-]{1,50}$/.test(customerCode)) || externalOrderId.length > 100) {
    return NextResponse.json({ error: '検索条件が不正です。' }, { status: 400 });
  }

  const page = Math.max(1, Number(params.get('page')) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from('patient_orders')
    .select(PATIENT_ORDER_WITH_DETAILS_COLUMNS, { count: 'exact' })
    .order('ordered_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);
  if (syncStatus) query = query.eq('sync_status', syncStatus);
  if (customerCode) query = query.eq('customer_code', customerCode);
  if (externalOrderId) query = query.eq('external_order_id', externalOrderId);

  const { data, error, count } = await query.range(from, to);
  timing.mark('orders_database');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Supabaseの生成型は埋め込み先patientを配列と推論するが、patient_idのFKは
  // many-to-oneなので実レスポンスは単一オブジェクトになる。
  const orders = (data ?? []) as unknown as PatientOrder[];
  const customerCodes = Array.from(new Set(orders.map((order) => order.customer_code)));
  const { data: clinics, error: clinicsError } = customerCodes.length > 0
    ? await supabase.from('clinics').select('customer_code, name').in('customer_code', customerCodes)
    : { data: [], error: null };
  timing.mark('clinics_database');
  if (clinicsError) return NextResponse.json({ error: clinicsError.message }, { status: 500 });

  const clinicNameMap = new Map((clinics ?? []).map((clinic) => [clinic.customer_code, clinic.name]));
  const response: BgjOrdersResponse = {
    orders: orders.map((order) => toOrderIntegrationRecord(order, clinicNameMap.get(order.customer_code) ?? null)),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
  return NextResponse.json(response, { headers: { 'Server-Timing': timing.header() } });
}
