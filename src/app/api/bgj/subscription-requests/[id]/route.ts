import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const status = body?.status;
  const version = Number(body?.version);
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;
  if (!['approved', 'rejected', 'canceled'].includes(String(status)) || !Number.isInteger(version) || version < 1) {
    return NextResponse.json({ error: '更新内容が不正です。' }, { status: 400 });
  }
  if (status === 'rejected' && !reason) return NextResponse.json({ error: '却下理由を入力してください。' }, { status: 400 });
  const { data, error } = await getSupabaseServerClient().rpc('transition_patient_subscription_request', {
    p_request_id: id, p_expected_version: version, p_to_status: status, p_actor_type: 'bgj',
    p_actor_identifier: session.user.email, p_reason: reason,
  });
  if (error) {
    const conflict = error.message.includes('更新競合') || error.message.includes('状態遷移');
    return NextResponse.json({ error: conflict ? '別の担当者が更新しました。再読み込みしてください。' : '申込状態を更新できませんでした。' }, { status: conflict ? 409 : 500 });
  }
  return NextResponse.json({ request: data });
}
