import { unstable_cache } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const BGJ_AGGREGATION_SETTINGS_TAG = 'bgj-aggregation-settings';

export type BgjAggregationSettings = {
  dashboard_followup_days: number;
  dashboard_dormant_days: number;
  dashboard_include_never_ordered: boolean;
  report_period_months: number;
};

// ダッシュボードと売上レポートが毎回同じapp_settings行を先に読む直列待機を省く。
// 設定画面のPATCH成功時にタグを即時失効し、時間上限としても5分で再検証する。
export const getBgjAggregationSettings = unstable_cache(
  async (): Promise<BgjAggregationSettings> => {
    const { data, error } = await getSupabaseServerClient()
      .from('app_settings')
      .select('dashboard_followup_days, dashboard_dormant_days, dashboard_include_never_ordered, report_period_months')
      .eq('id', 1)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('集計設定を取得できませんでした。');
    return data as BgjAggregationSettings;
  },
  ['bgj-aggregation-settings-v1'],
  { tags: [BGJ_AGGREGATION_SETTINGS_TAG], revalidate: 300 },
);
