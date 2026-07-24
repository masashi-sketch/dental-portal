import 'server-only';

import { unstable_cache } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// タブタイトル等、得意先コードから表示用クリニック名だけを引く軽量ヘルパー。
// clinic_patient_settings.display_name（患者向けブランド名）を優先し、無ければclinics.nameを使う。
// 変更頻度が低いデータのため、/api/admin/clinic-infoとは別に短時間キャッシュする。
export const getCachedClinicDisplayName = unstable_cache(
  async (customerCode: string): Promise<string | null> => {
    const supabase = getSupabaseServerClient();
    const [{ data: clinic }, { data: settings }] = await Promise.all([
      supabase.from('clinics').select('name').eq('customer_code', customerCode).maybeSingle<{ name: string }>(),
      supabase
        .from('clinic_patient_settings')
        .select('display_name')
        .eq('customer_code', customerCode)
        .maybeSingle<{ display_name: string | null }>(),
    ]);
    return settings?.display_name ?? clinic?.name ?? null;
  },
  ['clinic-display-name'],
  { revalidate: 300 },
);
