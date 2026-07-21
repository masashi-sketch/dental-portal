import type { Session } from 'next-auth';
import { readBgjViewingCustomerCode } from '@/lib/bgjViewingCustomerCode';

// 医院用ポータル（/admin/*）を「今どの得意先として見るか」を、クライアント側で
// 一箇所に解決する。clinicロールは常に自院のcustomerCode、BGJ職員は得意先詳細の
// 「医院ポータルを開く（ビュー）」ボタンがセットしたbgj-viewing-customer-code cookie
// （無ければビュー対象なしなのでnull）を使う。patientロール等はnull。
export function effectiveAdminCustomerCode(session: Session | null | undefined): string | null {
  if (session?.user?.role === 'clinic') return session.user.customerCode ?? null;
  if (session?.user?.role === 'bgj') return readBgjViewingCustomerCode();
  return null;
}
