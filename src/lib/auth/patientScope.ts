import 'server-only';
import type { Session } from 'next-auth';
import { PORTAL_COOKIE } from '@/lib/portalCookies';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

// 「今どの患者として見るか」を解決する。
// - role==='patient': 本人のIDのみ（他人のIDに化けることはできない）
// - role==='clinic'|'bgj': demo-patient-id cookie が示すプレビュー対象。
//   clinicは自院の患者でなければnull（他院の患者は絶対にプレビューできない）。
// - それ以外（未認証等）: null
export async function resolveEffectivePatientId(
  supabase: SupabaseClient,
  session: Session | null,
): Promise<string | null> {
  if (!session?.user) return null;

  if (session.user.role === 'patient') {
    return session.user.patientId;
  }

  if (session.user.role === 'clinic' || session.user.role === 'bgj') {
    const cookieStore = await cookies();
    const previewId = cookieStore.get(PORTAL_COOKIE.patientPreviewId)?.value ?? null;
    if (!previewId) return null;

    if (session.user.role === 'bgj') return previewId;

    const { data } = await supabase
      .from('patients')
      .select('customer_code')
      .eq('id', previewId)
      .maybeSingle<{ customer_code: string }>();
    return data?.customer_code === session.user.customerCode ? previewId : null;
  }

  return null;
}

// ブランディング表示用に「今どの得意先として見るか」を解決する。
// patient/clinicロールはセッションのcustomerCodeをそのまま使う
// （clinicは自院プレビュー制限が既にあるため安全）。bgjはdemo-patient-idの
// プレビュー対象患者から得意先コードを引く（bgjは他院患者もプレビュー可能なため）。
export async function resolveEffectiveCustomerCode(
  supabase: SupabaseClient,
  session: Session | null,
): Promise<string | null> {
  if (!session?.user) return null;

  if (session.user.role === 'patient' || session.user.role === 'clinic') {
    return session.user.customerCode;
  }

  if (session.user.role === 'bgj') {
    const cookieStore = await cookies();
    const previewId = cookieStore.get(PORTAL_COOKIE.patientPreviewId)?.value ?? null;
    if (!previewId) return null;
    const { data } = await supabase
      .from('patients')
      .select('customer_code')
      .eq('id', previewId)
      .maybeSingle<{ customer_code: string }>();
    return data?.customer_code ?? null;
  }

  return null;
}
