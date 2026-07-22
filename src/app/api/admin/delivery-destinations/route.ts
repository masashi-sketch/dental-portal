import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';
import { readShippingAddress } from '@/lib/shippingAddress';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DELIVERY_DESTINATION_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function patientBelongsToClinic(patientId: string, customerCode: string) {
  const { data } = await getSupabaseServerClient()
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('customer_code', customerCode)
    .eq('status', '有効')
    .maybeSingle();
  return Boolean(data);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role === 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const customerCode = await resolveScopedCustomerCode(session, request.nextUrl.searchParams.get('customerCode'));
  if (!customerCode) return NextResponse.json({ error: '医院が必要です。' }, { status: 400 });

  const patientId = request.nextUrl.searchParams.get('patientId');
  if (patientId && (!UUID_PATTERN.test(patientId) || !(await patientBelongsToClinic(patientId, customerCode)))) {
    return NextResponse.json({ error: '患者が見つかりません。' }, { status: 404 });
  }

  let query = getSupabaseServerClient()
    .from('delivery_destinations')
    .select(DELIVERY_DESTINATION_COLUMNS)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  query = patientId ? query.eq('patient_id', patientId) : query.eq('clinic_customer_code', customerCode);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ destinations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role === 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const requestedCode = typeof body?.customerCode === 'string' ? body.customerCode : null;
  const customerCode = await resolveScopedCustomerCode(session, requestedCode);
  if (!customerCode) return NextResponse.json({ error: '医院が必要です。' }, { status: 400 });

  const patientId = typeof body?.patientId === 'string' ? body.patientId : null;
  if (patientId && (!UUID_PATTERN.test(patientId) || !(await patientBelongsToClinic(patientId, customerCode)))) {
    return NextResponse.json({ error: '患者が見つかりません。' }, { status: 404 });
  }
  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  const address = readShippingAddress(body?.address);
  if (!label || label.length > 50 || !address) {
    return NextResponse.json({ error: '送り先名と住所を正しく入力してください。' }, { status: 400 });
  }

  const { data, error } = await getSupabaseServerClient().rpc('create_delivery_destination', {
    p_clinic_customer_code: patientId ? null : customerCode,
    p_patient_id: patientId,
    p_label: label,
    p_postal_code: address.postalCode,
    p_prefecture: address.prefecture,
    p_city: address.city,
    p_address_line1: address.addressLine1,
    p_address_line2: address.addressLine2,
    p_recipient_name: address.recipientName,
    p_phone: address.phone,
    p_is_default: body?.isDefault === true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ destination: data }, { status: 201 });
}
