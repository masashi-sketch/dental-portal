import type { Metadata } from 'next';
import { auth } from '@/auth';
import { getCachedClinicDisplayName } from '@/lib/clinicDisplayName';

const DEFAULT_TITLE = '医院ポータル';

// 実クリニックログイン（role: 'clinic'）はセッションのcustomerCodeが同期的に分かるため、
// ここでSSR時点から正しいタブタイトルを出せる。BGJ職員のタブ固有プレビューは
// サーバー側で解決できないため既定タイトルのままとし、クライアント側のuseActiveClinic
// （useDocumentTitle経由）が取得後に上書きする。
export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  if (session?.user.role !== 'clinic' || !session.user.customerCode) return { title: DEFAULT_TITLE };
  const clinicName = await getCachedClinicDisplayName(session.user.customerCode);
  return { title: clinicName ? `${clinicName} 管理ポータル` : DEFAULT_TITLE };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-desktop-density">
      {children}
    </div>
  );
}
