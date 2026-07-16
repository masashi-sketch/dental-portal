import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PERIODONTAL_GRADE_COLUMNS, PERIODONTAL_STAGE_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// ステージ・グレードのマスタはほぼ変化しないため、DBクエリ部分だけを1時間キャッシュする。
// auth()はcookieを読むためキャッシュ対象外に置き、認可チェック自体は毎回そのまま効かせる。
const getCachedMaster = unstable_cache(
  async () => {
    const supabase = getSupabaseServerClient();
    const [{ data: stages, error: stagesError }, { data: grades, error: gradesError }] = await Promise.all([
      supabase.from('periodontal_stages').select(PERIODONTAL_STAGE_COLUMNS).order('sort_order', { ascending: true }).limit(50),
      supabase.from('periodontal_grades').select(PERIODONTAL_GRADE_COLUMNS).order('sort_order', { ascending: true }).limit(50),
    ]);
    if (stagesError || gradesError) {
      throw new Error((stagesError ?? gradesError)?.message ?? 'マスタ情報の取得に失敗しました');
    }
    return { stages, grades };
  },
  ['periodontal-master'],
  { revalidate: 3600 },
);

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { stages, grades } = await getCachedMaster();
    return NextResponse.json({ stages, grades });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, { status: 500 });
  }
}
