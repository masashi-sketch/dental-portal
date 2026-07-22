import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveEffectivePatientId } from '@/lib/auth/patientScope';
import { readShippingAddress } from '@/lib/shippingAddress';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DELIVERY_DESTINATION_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const supabase = getSupabaseServerClient();
  const patientId = await resolveEffectivePatientId(supabase, session);
  if (!patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase
    .from('delivery_destinations')
    .select(DELIVERY_DESTINATION_COLUMNS)
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ destinations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'patient') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseServerClient();
  const patientId = await resolveEffectivePatientId(supabase, session);
  if (!patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  const address = readShippingAddress(body?.address);
  if (!label || label.length > 50 || !address) {
    return NextResponse.json({ error: '送り先名と住所を正しく入力してください。' }, { status: 400 });
  }
  const { data, error } = await supabase.rpc('create_delivery_destination', {
    p_clinic_customer_code: null,
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
