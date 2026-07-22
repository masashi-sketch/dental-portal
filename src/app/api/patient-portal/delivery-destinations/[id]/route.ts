import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveEffectivePatientId } from '@/lib/auth/patientScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function authorize(id: string) {
  const session = await auth();
  if (session?.user?.role !== 'patient') return { error: 'Unauthorized', status: 401 } as const;
  const supabase = getSupabaseServerClient();
  const patientId = await resolveEffectivePatientId(supabase, session);
  if (!patientId) return { error: 'Unauthorized', status: 401 } as const;
  const { data } = await supabase.from('delivery_destinations').select('id').eq('id', id).eq('patient_id', patientId).is('deleted_at', null).maybeSingle();
  if (!data) return { error: '送り先が見つかりません。', status: 404 } as const;
  return { supabase } as const;
}

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolved = await authorize(id);
  if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const { error } = await resolved.supabase.rpc('set_default_delivery_destination', { p_destination_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolved = await authorize(id);
  if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const { error } = await resolved.supabase.rpc('archive_delivery_destination', { p_destination_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: error.message.includes('進行中の注文') ? 409 : 400 });
  return NextResponse.json({ success: true });
}
