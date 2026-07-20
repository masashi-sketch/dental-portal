import { describe, expect, it } from 'vitest';
import { buildMonthlySalesChartData } from './MonthlySalesChart';
import type { BgjDashboardMonthlySales } from '@/lib/bgjDashboard';

const months = [
  { month: '2026-06', label: '6月' },
  { month: '2026-07', label: '7月' },
];

describe('buildMonthlySalesChartData', () => {
  it('担当者が4名以下なら全員を直接描画し、その他は出さない', () => {
    const monthlySales: BgjDashboardMonthlySales = {
      months,
      overall: [1000, 1200],
      byStaff: [
        { staffId: 'b', staffName: '担当B', values: [300, 400] },
        { staffId: 'a', staffName: '担当A', values: [700, 800] },
      ],
    };
    const { rows, staffSeries, hasOther } = buildMonthlySalesChartData(monthlySales);
    expect(hasOther).toBe(false);
    expect(staffSeries.map((s) => s.staffId)).toEqual(['a', 'b']); // staffIdの昇順で安定ソート
    expect(rows).toEqual([
      { month: '6月', 全体: 1000, '担当B': 300, '担当A': 700 },
      { month: '7月', 全体: 1200, '担当B': 400, '担当A': 800 },
    ]);
  });

  it('担当者が5名以上なら上位4名（合計値降順）のみ直接描画し、残りを「その他」に合算する', () => {
    const monthlySales: BgjDashboardMonthlySales = {
      months,
      overall: [1000, 1000],
      byStaff: [
        { staffId: 'staff-1', staffName: 'A', values: [500, 500] },
        { staffId: 'staff-2', staffName: 'B', values: [100, 100] },
        { staffId: 'staff-3', staffName: 'C', values: [90, 90] },
        { staffId: 'staff-4', staffName: 'D', values: [80, 80] },
        { staffId: 'staff-5', staffName: 'E', values: [70, 70] },
        { staffId: 'staff-6', staffName: 'F', values: [60, 60] },
      ],
    };
    const { rows, staffSeries, hasOther } = buildMonthlySalesChartData(monthlySales);
    expect(hasOther).toBe(true);
    // 合計値: A=1000, B=200, C=180, D=160, E=140, F=120 → 上位4はA,B,C,D
    expect(staffSeries.map((s) => s.staffName).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(rows[0]['その他']).toBe(130); // E(70) + F(60)
  });

  it('担当未割当（staffId: null）も1系列として扱う', () => {
    const monthlySales: BgjDashboardMonthlySales = {
      months,
      overall: [500, 500],
      byStaff: [
        { staffId: null, staffName: '担当未割当', values: [500, 500] },
      ],
    };
    const { rows, staffSeries } = buildMonthlySalesChartData(monthlySales);
    expect(staffSeries).toHaveLength(1);
    expect(rows[0]['担当未割当']).toBe(500);
  });

  it('全担当者の合計が0の担当者だけが上位4名を超えて残る場合、その他は表示しない', () => {
    const monthlySales: BgjDashboardMonthlySales = {
      months,
      overall: [400, 400],
      byStaff: [
        { staffId: 's1', staffName: 'A', values: [100, 100] },
        { staffId: 's2', staffName: 'B', values: [100, 100] },
        { staffId: 's3', staffName: 'C', values: [100, 100] },
        { staffId: 's4', staffName: 'D', values: [100, 100] },
        { staffId: 's5', staffName: 'E（実績0）', values: [0, 0] },
      ],
    };
    const { hasOther } = buildMonthlySalesChartData(monthlySales);
    expect(hasOther).toBe(false);
  });
});
