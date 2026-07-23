import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { signPortalPreviewToken, type PortalPreviewKind } from '@/lib/auth/portalPreviewToken';

type PreviewRequest = { kind?: PortalPreviewKind; targetId?: string };

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !['bgj', 'clinic'].includes(session.user.role)) {
    return Response.json({ error: '認証が必要です。' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as PreviewRequest | null;
  const kind = body?.kind;
  const targetId = body?.targetId?.trim();
  if (!kind || !targetId || !['clinic', 'patient'].includes(kind)) {
    return Response.json({ error: 'プレビュー対象が不正です。' }, { status: 400 });
  }
  if (kind === 'clinic' && session.user.role !== 'bgj') {
    return Response.json({ error: '医院ポータルの代理閲覧権限がありません。' }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();
  if (kind === 'clinic') {
    const { data, error } = await supabase.from('clinics').select('customer_code').eq('customer_code', targetId).maybeSingle();
    if (error) return Response.json({ error: '医院情報の確認に失敗しました。' }, { status: 500 });
    if (!data) return Response.json({ error: '対象医院が見つかりません。' }, { status: 404 });
  } else {
    const { data, error } = await supabase.from('patients').select('id, customer_code').eq('id', targetId).maybeSingle<{ id: string; customer_code: string }>();
    if (error) return Response.json({ error: '患者情報の確認に失敗しました。' }, { status: 500 });
    if (!data) return Response.json({ error: '対象患者が見つかりません。' }, { status: 404 });
    if (session.user.role === 'clinic' && data.customer_code !== session.user.customerCode) {
      return Response.json({ error: '他院の患者はプレビューできません。' }, { status: 403 });
    }
  }

  return Response.json({ token: signPortalPreviewToken(session, kind, targetId) });
}
