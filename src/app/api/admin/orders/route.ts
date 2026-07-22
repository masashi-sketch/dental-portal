import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { readShippingAddress } from '@/lib/shippingAddress';
import {
  PATIENT_ORDER_WITH_DETAILS_COLUMNS,
} from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role === 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customerCode = await resolveScopedCustomerCode(session, request.nextUrl.searchParams.get('customerCode'));
  if (!customerCode) return NextResponse.json({ error: 'customerCodeが必要です。' }, { status: 400 });

  const { data, error } = await getSupabaseServerClient()
    .from('patient_orders')
    .select(PATIENT_ORDER_WITH_DETAILS_COLUMNS)
    .eq('customer_code', customerCode)
    .order('ordered_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role === 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const customerCode = await resolveScopedCustomerCode(session, body?.customerCode ?? null);
  const { patientId, productId, fulfillmentMethod, idempotencyKey } = body ?? {};
  const quantity = Number(body?.quantity ?? 1);
  if (!customerCode || typeof patientId !== 'string' || typeof productId !== 'string') {
    return NextResponse.json({ error: '患者・商品・医院は必須です。' }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return NextResponse.json({ error: '数量は1〜100の整数で指定してください。' }, { status: 400 });
  }
  if (fulfillmentMethod !== 'pickup' && fulfillmentMethod !== 'delivery') {
    return NextResponse.json({ error: '受け取り方法が不正です。' }, { status: 400 });
  }
  const shippingAddress = fulfillmentMethod === 'delivery' ? readShippingAddress(body?.shippingAddress) : null;
  if (fulfillmentMethod === 'delivery' && !shippingAddress) {
    return NextResponse.json({ error: '自宅配送では配送先をすべて入力してください。' }, { status: 400 });
  }
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof idempotencyKey !== 'string' || !uuidPattern.test(idempotencyKey)) {
    return NextResponse.json({ error: '冪等キーが不正です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const isBgj = session.user.role === 'bgj';
  const { data: orderId, error: createError } = await supabase.rpc('create_portal_patient_order', {
    p_customer_code: customerCode,
    p_patient_id: patientId,
    p_items: [{ productId, quantity }],
    p_fulfillment_method: fulfillmentMethod,
    p_shipping_postal_code: shippingAddress?.postalCode ?? null,
    p_shipping_prefecture: shippingAddress?.prefecture ?? null,
    p_shipping_city: shippingAddress?.city ?? null,
    p_shipping_address_line1: shippingAddress?.addressLine1 ?? null,
    p_shipping_address_line2: shippingAddress?.addressLine2 ?? null,
    p_shipping_recipient_name: shippingAddress?.recipientName ?? null,
    p_shipping_phone: shippingAddress?.phone ?? null,
    p_idempotency_key: idempotencyKey,
    p_created_via: isBgj ? 'bgj_portal' : 'clinic_portal',
    p_actor_type: isBgj ? 'bgj' : 'clinic',
    p_actor_identifier: session.user.email ?? session.user.name ?? session.user.customerCode ?? 'clinic-user',
  });
  if (createError || typeof orderId !== 'string') {
    return NextResponse.json({ error: createError?.message ?? '注文を作成できませんでした。' }, { status: 500 });
  }

  const { data: created, error: fetchError } = await supabase
    .from('patient_orders')
    .select(PATIENT_ORDER_WITH_DETAILS_COLUMNS)
    .eq('id', orderId)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  return NextResponse.json({ order: created }, { status: 201 });
}
