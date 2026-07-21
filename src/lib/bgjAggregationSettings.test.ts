// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (callback: () => unknown) => callback,
}));

let settingsResult: { data: Record<string, unknown> | null; error: { message: string } | null };
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => settingsResult }),
      }),
    }),
  }),
}));

const { getBgjAggregationSettings } = await import('./bgjAggregationSettings');

describe('getBgjAggregationSettings', () => {
  beforeEach(() => {
    settingsResult = {
      data: {
        dashboard_followup_days: 60,
        dashboard_dormant_days: 90,
        dashboard_include_never_ordered: true,
        report_period_months: 6,
      },
      error: null,
    };
  });

  it('集計に必要な設定を返す', async () => {
    await expect(getBgjAggregationSettings()).resolves.toEqual(settingsResult.data);
  });

  it('DBエラーを例外として返す', async () => {
    settingsResult = { data: null, error: { message: 'database error' } };
    await expect(getBgjAggregationSettings()).rejects.toThrow('database error');
  });
});
