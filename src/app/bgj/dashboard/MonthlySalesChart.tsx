'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const monthlyData = [
  { month: '1月', 全体: 4820, 山本: 1650, 田中: 1420, 佐藤: 1750 },
  { month: '2月', 全体: 5100, 山本: 1780, 田中: 1560, 佐藤: 1760 },
  { month: '3月', 全体: 5680, 山本: 1920, 田中: 1740, 佐藤: 2020 },
  { month: '4月', 全体: 5240, 山本: 1830, 田中: 1580, 佐藤: 1830 },
  { month: '5月', 全体: 5890, 山本: 2050, 田中: 1760, 佐藤: 2080 },
  { month: '6月', 全体: 6120, 山本: 2180, 田中: 1890, 佐藤: 2050 },
];

export default function MonthlySalesChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={monthlyData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} unit="千" />
        <Tooltip formatter={(v: unknown) => `¥${(v as number).toLocaleString()}千`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="全体" stroke="#7c3aed" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="山本" stroke="#0ea5e9" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="田中" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="佐藤" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}
