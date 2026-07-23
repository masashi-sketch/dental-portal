import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== 'patient' || !session.user.patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const version = Number(body?.version);
  if (!Number.isInteger(version) || version < 1) return NextResponse.json({ error: '更新情報が不正です。' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const { data: owned } = await supabase.from('patient_subscription_requests').select('id').eq('id', id).eq('patient_id', session.user.patientId).maybeSingle();
  if (!owned) return NextResponse.json({ error: '申込が見つかりません。' }, { status: 404 });
  const { data, error } = await supabase.rpc('transition_patient_subscription_request', {
    p_request_id: id, p_expected_version: version, p_to_status: 'canceled', p_actor_type: 'patient',
    p_actor_identifier: session.user.email ?? session.user.patientId, p_reason: null,
  });
  if (error) {
    const conflict = error.message.includes('更新競合') || error.message.includes('状態遷移');
    return NextResponse.json({ error: conflict ? '申込状態が更新されています。再読み込みしてください。' : '申込を取り消せませんでした。' }, { status: conflict ? 409 : 500 });
  }
  return NextResponse.json({ request: data });
}
