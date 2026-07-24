import type { Metadata } from 'next';
import { auth } from '@/auth';
import { getCachedClinicDisplayName } from '@/lib/clinicDisplayName';

const DEFAULT_TITLE = '患者様専用ポータル';

// 実患者ログイン（role: 'patient'）はセッションのcustomerCodeが同期的に分かるため、
// ここでSSR時点から正しいタブタイトルを出せる。医院・BGJ職員のプレビューはセッションの
// customerCodeが患者自身のものではないためサーバー側で解決できず、既定タイトルのままとし、
// クライアント側のusePatientClinicBranding（useDocumentTitle経由）が取得後に上書きする。
// このlayout自体はURLを変えないルートグループ（(patient)）にのみ適用され、DOMは追加しない。
export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  if (session?.user.role !== 'patient' || !session.user.customerCode) return { title: DEFAULT_TITLE };
  const clinicName = await getCachedClinicDisplayName(session.user.customerCode);
  return { title: clinicName ? `${clinicName} 患者様専用ポータル` : DEFAULT_TITLE };
}

export default function PatientPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
