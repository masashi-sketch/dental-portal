'use client';

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { BgjSalesReportAreaRow, BgjSalesReportMonthlyTrend } from '@/lib/bgjReports';

const SINGLE_SERIES_COLOR = '#4a3aa7';

export function MonthlySalesChart({ monthlyTrend }: { monthlyTrend: BgjSalesReportMonthlyTrend[] }) {
  const data = monthlyTrend.map((m) => ({ month: m.label, 売上: m.salesAmount }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: unknown) => `¥${(v as number).toLocaleString()}`} />
        <Bar dataKey="売上" fill={SINGLE_SERIES_COLOR} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyOrdersChart({ monthlyTrend }: { monthlyTrend: BgjSalesReportMonthlyTrend[] }) {
  const data = monthlyTrend.map((m) => ({ month: m.label, 件数: m.orderCount }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} unit="件" />
        <Tooltip formatter={(v: unknown) => `${v as number}件`} />
        <Line type="monotone" dataKey="件数" stroke={SINGLE_SERIES_COLOR} strokeWidth={2.5} dot={{ r: 4, fill: SINGLE_SERIES_COLOR }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AreaSalesChart({ byArea }: { byArea: BgjSalesReportAreaRow[] }) {
  const data = byArea.map((a) => ({ area: a.area, 売上: a.currentMonthSales }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="area" tick={{ fontSize: 12 }} width={50} />
        <Tooltip formatter={(v: unknown) => `¥${(v as number).toLocaleString()}`} />
        <Bar dataKey="売上" fill={SINGLE_SERIES_COLOR} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
