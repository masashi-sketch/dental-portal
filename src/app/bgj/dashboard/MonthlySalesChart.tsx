'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { BgjDashboardMonthlySales } from '@/lib/bgjDashboard';

// dataviz skillの検証済みカテゴリカル色（全ペア比較でCVD検証パス。詳細は
// node_modules外のdatavizスキルreferences/palette.md参照）。担当者別の直接描画は
// 最大4名までとし、それを超える分は「その他」に合算する（無制限に線を増やすと
// スパゲッティチャート化しCVD非対応になるため）。
const STAFF_COLORS = ['#2a78d6', '#008300', '#e87ba4', '#eda100'];
const TOTAL_COLOR = '#4a3aa7';
const OTHER_COLOR = '#1baf7a';
const MAX_DIRECT_STAFF = 4;

type ChartRow = { month: string; [seriesKey: string]: string | number };

export function buildMonthlySalesChartData(monthlySales: BgjDashboardMonthlySales) {
  const { months, overall, byStaff } = monthlySales;

  const totals = byStaff.map((s) => ({ ...s, total: s.values.reduce((sum, v) => sum + v, 0) }));
  const topStaff = [...totals]
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_DIRECT_STAFF)
    // 上位内での色割り当てはstaffIdで安定させる（他の担当者の実績変動で
    // 色が入れ替わらないようにする）。
    .sort((a, b) => (a.staffId ?? '').localeCompare(b.staffId ?? ''));
  const topStaffIds = new Set(topStaff.map((s) => s.staffId));
  const otherStaff = totals.filter((s) => !topStaffIds.has(s.staffId));
  const otherHasData = otherStaff.some((s) => s.total > 0);

  const rows: ChartRow[] = months.map((m, i) => {
    const row: ChartRow = { month: m.label, 全体: overall[i] ?? 0 };
    for (const s of topStaff) row[s.staffName] = s.values[i] ?? 0;
    if (otherHasData) {
      row['その他'] = otherStaff.reduce((sum, s) => sum + (s.values[i] ?? 0), 0);
    }
    return row;
  });

  return { rows, staffSeries: topStaff, hasOther: otherHasData };
}

export default function MonthlySalesChart({ monthlySales }: { monthlySales: BgjDashboardMonthlySales }) {
  const { rows, staffSeries, hasOther } = useMemo(() => buildMonthlySalesChartData(monthlySales), [monthlySales]);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: unknown) => `¥${(v as number).toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="全体" stroke={TOTAL_COLOR} strokeWidth={2.5} dot={false} />
        {staffSeries.map((s, i) => (
          <Line
            key={s.staffId ?? 'unassigned'}
            type="monotone"
            dataKey={s.staffName}
            stroke={STAFF_COLORS[i]}
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
          />
        ))}
        {hasOther && (
          <Line type="monotone" dataKey="その他" stroke={OTHER_COLOR} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
