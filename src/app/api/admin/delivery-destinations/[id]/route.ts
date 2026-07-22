import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveScopedCustomerCode } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DELIVERY_DESTINATION_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

async function resolveDestination(request: NextRequest, id: string) {
  const session = await auth();
  if (!session?.user || session.user.role === 'patient') return { error: 'Unauthorized', status: 401 } as const;
  const customerCode = await resolveScopedCustomerCode(session, request.nextUrl.searchParams.get('customerCode'));
  if (!customerCode) return { error: '医院が必要です。', status: 400 } as const;
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('delivery_destinations')
    .select(`${DELIVERY_DESTINATION_COLUMNS}, patient:patients!patient_id(customer_code)`)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  const patient = data?.patient as { customer_code?: string } | null | undefined;
  const inScope = data?.clinic_customer_code === customerCode || patient?.customer_code === customerCode;
  if (!data || !inScope) return { error: '送り先が見つかりません。', status: 404 } as const;
  return { session, customerCode, destination: data, supabase } as const;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolved = await resolveDestination(request, id);
  if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (body?.isDefault !== true) return NextResponse.json({ error: '変更内容が不正です。' }, { status: 400 });
  const { error } = await resolved.supabase.rpc('set_default_delivery_destination', { p_destination_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolved = await resolveDestination(request, id);
  if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const { error } = await resolved.supabase.rpc('archive_delivery_destination', { p_destination_id: id });
  if (error) {
    const inUse = error.message.includes('進行中の注文');
    return NextResponse.json({ error: error.message }, { status: inUse ? 409 : 400 });
  }
  return NextResponse.json({ success: true });
}
