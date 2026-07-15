import 'server-only';
import type { Session } from 'next-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

// クリニック（clinic-credentials）ログインは、クライアントが送ってきたcustomerCodeを
// 一切信用せず、必ずセッションの得意先コードで上書きする。BGJ職員（Google）は
// 従来通りクエリ／bodyのcustomerCode指定を信頼する。
export function resolveScopedCustomerCode(
  session: Session,
  requestedCode: string | null,
): string | null {
  return session.user.role === 'clinic' ? session.user.customerCode : requestedCode;
}

// patient_id経由のAPI（詳細・診断など）で、クリニックログインが他院の患者IDに
// アクセスしていないかを検証する。BGJ職員は常にtrue。
export async function isPatientInScope(
  supabase: SupabaseClient,
  patientId: string,
  session: Session,
): Promise<boolean> {
  if (session.user.role !== 'clinic') return true;
  const { data } = await supabase
    .from('patients')
    .select('customer_code')
    .eq('id', patientId)
    .maybeSingle<{ customer_code: string }>();
  return data?.customer_code === session.user.customerCode;
}
