import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BgjDashboard from './page';
import type { BgjDashboardOverview } from '@/lib/bgjDashboard';

const overview: BgjDashboardOverview = {
  generatedAt: '2026-07-20T01:00:00Z',
  kpis: {
    totalClinicCount: 3,
    totalClinicCountDelta: 1,
    currentMonthSalesTotal: 120000,
    currentMonthSalesGrowthPct: 8.2,
    followUpCount: 2,
    dormantRiskCount: 1,
  },
  alerts: [
    { customerCode: 'A000001', name: 'サンプル歯科', level: 'high', issue: '90日以上未注文', daysSinceLastOrder: 95 },
  ],
  monthlySales: {
    months: [{ month: '2026-07', label: '7月' }],
    overall: [120000],
    byStaff: [{ staffId: 'staff-1', staffName: '営業太郎', values: [120000] }],
  },
  recentOrders: [
    { customerCode: 'A000001', clinicName: 'サンプル歯科', staffName: '営業太郎', amount: 5000, orderDate: '2026-07-19' },
  ],
  ranking: [
    { customerCode: 'A000001', clinicName: 'サンプル歯科', staffName: '営業太郎', currentMonthAmount: 120000, growthPct: 8.2 },
  ],
};

let hookState: { overview: BgjDashboardOverview | null; loading: boolean; error: string | null } = {
  overview,
  loading: false,
  error: null,
};

vi.mock('next/dynamic', () => ({ default: () => () => <div>実データグラフ</div> }));
vi.mock('@/hooks/useBgjDashboardOverview', () => ({
  useBgjDashboardOverview: () => hookState,
}));

describe('BgjDashboard', () => {
  it('KPI・アラート・最近の注文・ランキングを実データで表示する', () => {
    hookState = { overview, loading: false, error: null };
    render(<BgjDashboard />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('¥120,000').length).toBeGreaterThan(0);
    expect(screen.getByText('2件')).toBeInTheDocument();
    expect(screen.getByText('1件')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent === 'A000001 · 90日以上未注文')).toBeInTheDocument();
    expect(screen.getByText('実データグラフ')).toBeInTheDocument();
    expect(screen.getAllByText('サンプル歯科').length).toBeGreaterThan(0);
  });

  it('ローディング中はKPIを「—」表示し、一覧は読み込み中と表示する', () => {
    hookState = { overview: null, loading: true, error: null };
    render(<BgjDashboard />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByText('読み込み中...').length).toBeGreaterThan(0);
  });

  it('エラー時はエラーメッセージを表示する', () => {
    hookState = { overview: null, loading: false, error: '集計データを取得できませんでした' };
    render(<BgjDashboard />);
    expect(screen.getByText('集計データを取得できませんでした')).toBeInTheDocument();
  });

  it('アラート・注文・ランキングが0件のときは空状態メッセージを表示する', () => {
    hookState = {
      overview: { ...overview, alerts: [], recentOrders: [], ranking: [] },
      loading: false,
      error: null,
    };
    render(<BgjDashboard />);
    expect(screen.getByText('現在アラートはありません')).toBeInTheDocument();
    expect(screen.getByText('注文はまだありません')).toBeInTheDocument();
    expect(screen.getByText('今月の注文実績がまだありません')).toBeInTheDocument();
  });
});
