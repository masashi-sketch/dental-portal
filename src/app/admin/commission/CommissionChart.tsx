'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// 月次グラフデータ
const monthlyData = [
  { month: '1月', 医院売上: 18200, コミッション: 1820, 患者来院数: 12 },
  { month: '2月', 医院売上: 21500, コミッション: 2150, 患者来院数: 15 },
  { month: '3月', 医院売上: 19800, コミッション: 1980, 患者来院数: 13 },
  { month: '4月', 医院売上: 24300, コミッション: 2430, 患者来院数: 18 },
  { month: '5月', 医院売上: 22100, コミッション: 2210, 患者来院数: 16 },
  { month: '6月', 医院売上: 27300, コミッション: 2730, 患者来院数: 21 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = (value: any, name: any) => {
  const num = Number(value);
  if (name === '患者来院数') return [`${num}名`, name];
  return [`¥${num.toLocaleString()}`, name];
};

export default function CommissionChart() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={monthlyData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
        <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#64748b' }} />
        <YAxis yAxisId="money" tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#64748b' }} width={56} />
        <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} width={36} unit="名" />
        <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
        <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
        <Line yAxisId="money" type="monotone" dataKey="医院売上"   stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        <Line yAxisId="money" type="monotone" dataKey="コミッション" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        <Line yAxisId="count" type="monotone" dataKey="患者来院数"  stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
