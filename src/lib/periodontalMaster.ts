import 'server-only';

import { unstable_cache } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PERIODONTAL_GRADE_COLUMNS, PERIODONTAL_STAGE_COLUMNS } from '@/lib/supabase/types';

// 参照頻度が高く更新頻度が低い歯周病マスタを、APIをまたいで同じキャッシュから返す。
export const getCachedPeriodontalMaster = unstable_cache(
  async () => {
    const supabase = getSupabaseServerClient();
    const [{ data: stages, error: stagesError }, { data: grades, error: gradesError }] = await Promise.all([
      supabase.from('periodontal_stages').select(PERIODONTAL_STAGE_COLUMNS).order('sort_order', { ascending: true }).limit(50),
      supabase.from('periodontal_grades').select(PERIODONTAL_GRADE_COLUMNS).order('sort_order', { ascending: true }).limit(50),
    ]);
    if (stagesError || gradesError) {
      throw new Error((stagesError ?? gradesError)?.message ?? 'マスタ情報の取得に失敗しました');
    }
    return { stages: stages ?? [], grades: grades ?? [] };
  },
  ['periodontal-master'],
  { revalidate: 3600 },
);
