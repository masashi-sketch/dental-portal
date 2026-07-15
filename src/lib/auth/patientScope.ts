import 'server-only';
import type { Session } from 'next-auth';
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
    const previewId = cookieStore.get('demo-patient-id')?.value ?? null;
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
