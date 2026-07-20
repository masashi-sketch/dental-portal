'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { AdminOverviewMonth } from '@/lib/adminOverview';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = (value: any, name: any) => {
  const number = Number(value);
  if (name === '内部注文件数') return [`${number}件`, name];
  return [`¥${number.toLocaleString()}`, name];
};

export default function CommissionChart({ data }: { data: AdminOverviewMonth[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
        <XAxis dataKey="label" tick={{ fontSize: 13, fill: '#64748b' }} />
        <YAxis yAxisId="money" tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#64748b' }} width={56} />
        <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} width={36} unit="件" />
        <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
        <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
        <Line yAxisId="money" type="monotone" dataKey="internalOrderAmount" name="内部注文参考金額" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
        <Line yAxisId="count" type="monotone" dataKey="internalOrderCount" name="内部注文件数" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
