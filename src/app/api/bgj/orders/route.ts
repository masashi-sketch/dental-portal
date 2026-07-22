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
const CUSTOMER_CODE_PATTERN = /^[A-Z]\d{6}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

type CreateOrderLine = { productId: string; quantity: number };

function readCreateOrderLines(value: unknown): CreateOrderLine[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return null;
  const lines: CreateOrderLine[] = [];
  const productIds = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const { productId, quantity } = item as Record<string, unknown>;
    if (typeof productId !== 'string' || !UUID_PATTERN.test(productId)) return null;
    if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 100) return null;
    if (productIds.has(productId)) return null;
    productIds.add(productId);
    lines.push({ productId, quantity: Number(quantity) });
  }
  return lines;
}

export async function POST(request: NextRequest) {
  const timing = new ServerTiming();
  const session = await auth();
  timing.mark('auth');
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const customerCode = typeof body?.customerCode === 'string' ? body.customerCode.trim().toUpperCase() : '';
  const patientId = typeof body?.patientId === 'string' ? body.patientId : '';
  const idempotencyKey = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey : '';
  const deliveryDestinationId = typeof body?.deliveryDestinationId === 'string' ? body.deliveryDestinationId : '';
  const items = readCreateOrderLines(body?.items);
  const fulfillmentMethod = body?.fulfillmentMethod;
  if (!CUSTOMER_CODE_PATTERN.test(customerCode) || !UUID_PATTERN.test(patientId) || !UUID_PATTERN.test(idempotencyKey) || !UUID_PATTERN.test(deliveryDestinationId) || !items || !['pickup', 'delivery'].includes(String(fulfillmentMethod))) {
    return NextResponse.json({ error: '受注内容が不正です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: orderId, error: createError } = await supabase.rpc('create_portal_patient_order', {
    p_customer_code: customerCode,
    p_patient_id: patientId,
    p_items: items,
    p_fulfillment_method: fulfillmentMethod,
    p_delivery_destination_id: deliveryDestinationId,
    p_idempotency_key: idempotencyKey,
    p_created_via: 'bgj_portal',
    p_actor_type: 'bgj',
    p_actor_identifier: session.user.email,
  });
  timing.mark('create_database');
  if (createError || typeof orderId !== 'string') {
    const knownError = createError?.message && [
      '商品は1〜50種類で指定してください。',
      '患者が見つかりません。',
      '商品または数量が不正です。',
      '選択できない商品が含まれています。',
      '送り先が見つかりません。',
      '医院受け取りでは注文医院の送り先を選択してください。',
      '自宅配送では注文患者の送り先を選択してください。',
    ].find((message) => createError.message.includes(message));
    return NextResponse.json(
      { error: knownError ?? '受注を登録できませんでした。' },
      { status: knownError ? 400 : 500 },
    );
  }

  const [orderResult, clinicResult] = await Promise.all([
    supabase.from('patient_orders').select(PATIENT_ORDER_WITH_DETAILS_COLUMNS).eq('id', orderId).single(),
    supabase.from('clinics').select('name').eq('customer_code', customerCode).single(),
  ]);
  timing.mark('created_order_database');
  const fetchError = orderResult.error ?? clinicResult.error;
  if (fetchError || !orderResult.data) {
    return NextResponse.json({ error: fetchError?.message ?? '登録した受注を取得できませんでした。' }, { status: 500 });
  }

  return NextResponse.json(
    { order: toOrderIntegrationRecord(orderResult.data as unknown as PatientOrder, clinicResult.data?.name ?? null) },
    { status: 201, headers: { 'Server-Timing': timing.header() } },
  );
}
