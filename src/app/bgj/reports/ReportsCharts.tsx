'use client';

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const monthlyTotal = [
  { month: '1月', 売上: 4820, 件数: 38 },
  { month: '2月', 売上: 5100, 件数: 41 },
  { month: '3月', 売上: 5680, 件数: 47 },
  { month: '4月', 売上: 5240, 件数: 43 },
  { month: '5月', 売上: 5890, 件数: 49 },
  { month: '6月', 売上: 6120, 件数: 51 },
];

const byArea = [
  { area: '東京', 売上: 1960, 得意先数: 78 },
  { area: '大阪', 売上: 1420, 得意先数: 62 },
  { area: '名古屋', 売上: 870, 得意先数: 41 },
  { area: '福岡', 売上: 980, 得意先数: 38 },
  { area: '札幌', 売上: 650, 得意先数: 29 },
];

export function MonthlySalesChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={monthlyTotal}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} unit="千" />
        <Tooltip formatter={(v: unknown) => `¥${(v as number).toLocaleString()}千`} />
        <Bar dataKey="売上" fill="#7c3aed" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyOrdersChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={monthlyTotal}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} unit="件" />
        <Tooltip formatter={(v: unknown) => `${v as number}件`} />
        <Line type="monotone" dataKey="件数" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AreaSalesChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={byArea} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 11 }} unit="千" />
        <YAxis type="category" dataKey="area" tick={{ fontSize: 12 }} width={50} />
        <Tooltip formatter={(v: unknown) => `¥${(v as number).toLocaleString()}千`} />
        <Bar dataKey="売上" fill="#7c3aed" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
