import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_REQUEST_WITH_DETAILS_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'patient' || !session.user.patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await getSupabaseServerClient().from('patient_subscription_requests')
    .select(SUBSCRIPTION_REQUEST_WITH_DETAILS_COLUMNS)
    .eq('patient_id', session.user.patientId)
    .order('submitted_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'patient' || !session.user.patientId || !session.user.customerCode) {
    return NextResponse.json({ error: '患者本人としてログインしてください。' }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const productId = typeof body?.productId === 'string' ? body.productId : '';
  const destinationId = typeof body?.deliveryDestinationId === 'string' ? body.deliveryDestinationId : '';
  const idempotencyKey = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey : '';
  const quantity = Number(body?.quantity);
  const termMonths = Number(body?.termMonths);
  const fulfillmentMethod = body?.fulfillmentMethod;
  if (!UUID.test(productId) || !UUID.test(destinationId) || !UUID.test(idempotencyKey)
      || !Number.isInteger(quantity) || quantity < 1 || quantity > 100
      || ![3, 6].includes(termMonths) || !['pickup', 'delivery'].includes(String(fulfillmentMethod))
      || body?.consent !== true) {
    return NextResponse.json({ error: '申込内容と同意事項を確認してください。' }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  const { data: requestId, error } = await supabase.rpc('create_patient_subscription_request', {
    p_customer_code: session.user.customerCode,
    p_patient_id: session.user.patientId,
    p_product_id: productId,
    p_quantity: quantity,
    p_term_months: termMonths,
    p_fulfillment_method: fulfillmentMethod,
    p_delivery_destination_id: destinationId,
    p_idempotency_key: idempotencyKey,
    p_actor_identifier: session.user.email ?? session.user.patientId,
  });
  if (error || typeof requestId !== 'string') {
    const known = ['患者が見つかりません。', '選択できない商品です。', '送り先が見つかりません。', '医院受け取りでは所属医院の送り先を選択してください。', '自宅配送では本人の送り先を選択してください。']
      .find((message) => error?.message.includes(message));
    return NextResponse.json({ error: known ?? '定期購入を申し込めませんでした。' }, { status: known ? 400 : 500 });
  }
  const { data, error: fetchError } = await supabase.from('patient_subscription_requests')
    .select(SUBSCRIPTION_REQUEST_WITH_DETAILS_COLUMNS).eq('id', requestId).single();
  if (fetchError) return NextResponse.json({ error: '登録した申込を取得できませんでした。' }, { status: 500 });
  return NextResponse.json({ request: data }, { status: 201 });
}
