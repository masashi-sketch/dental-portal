import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ReportsPage from './page';
import type { BgjSalesReport } from '@/lib/bgjReports';

const report: BgjSalesReport = {
  generatedAt: '2026-07-20T01:00:00Z',
  period: { start: '2026-02-01', end: '2026-07-31', label: '2026年02月〜2026年07月' },
  summary: { totalSales: 300000, monthlyAvgSales: 50000, totalOrderCount: 42, avgOrderValue: 7142, yoySalesGrowthPct: 5.5 },
  monthlyTrend: [{ month: '2026-07', label: '7月', salesAmount: 50000, orderCount: 7 }],
  byStaff: [
    { staffId: 'staff-1', staffName: '営業太郎', clinicCount: 10, currentMonthSales: 50000, currentMonthVisitCount: 3, salesPerClinic: 5000 },
  ],
  byArea: [{ area: '東京都', clinicCount: 10, currentMonthSales: 50000 }],
  topClinics: [
    { customerCode: 'A000001', name: 'サンプル歯科', staffName: '営業太郎', totalSales: 300000, monthlyAvgSales: 50000 },
  ],
};

const downloadCsvMock = vi.fn();

let hookState: { report: BgjSalesReport | null; loading: boolean; error: string | null } = {
  report,
  loading: false,
  error: null,
};

vi.mock('next/dynamic', () => ({ default: () => () => <div>実データグラフ</div> }));
vi.mock('@/hooks/useBgjSalesReport', () => ({
  useBgjSalesReport: () => hookState,
}));
vi.mock('@/lib/csv', async () => {
  const actual = await vi.importActual<typeof import('@/lib/csv')>('@/lib/csv');
  return { ...actual, downloadCsv: (...args: unknown[]) => downloadCsvMock(...args) };
});

describe('ReportsPage', () => {
  beforeEach(() => {
    downloadCsvMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('サマリー・期間ラベルを実データで表示する', () => {
    hookState = { report, loading: false, error: null };
    render(<ReportsPage />);
    expect(screen.getByText('2026年02月〜2026年07月')).toBeInTheDocument();
    expect(screen.getByText('¥300,000')).toBeInTheDocument();
    expect(screen.getByText('前年比 +5.5%')).toBeInTheDocument();
    expect(screen.getByText('42件')).toBeInTheDocument();
  });

  it('ローディング中は読み込み中を表示し、CSV出力ボタンを無効化する', () => {
    hookState = { report: null, loading: true, error: null };
    render(<ReportsPage />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CSV出力/ })).toBeDisabled();
  });

  it('エラー時はエラーメッセージを表示する', () => {
    hookState = { report: null, loading: false, error: 'レポート情報を取得できませんでした' };
    render(<ReportsPage />);
    expect(screen.getByText('レポート情報を取得できませんでした')).toBeInTheDocument();
  });

  it('担当別タブへ切り替えて表示できる', () => {
    hookState = { report, loading: false, error: null };
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: '担当別' }));
    expect(screen.getByText('営業太郎')).toBeInTheDocument();
    expect(screen.getByText('10件')).toBeInTheDocument();
  });

  it('CSV出力ボタンで現在のタブのデータをダウンロードする', () => {
    hookState = { report, loading: false, error: null };
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /CSV出力/ }));
    expect(downloadCsvMock).toHaveBeenCalledTimes(1);
    const [filename, csv] = downloadCsvMock.mock.calls[0];
    expect(filename).toBe('月次推移.csv');
    expect(csv).toContain('7月,50000,7');

    fireEvent.click(screen.getByRole('button', { name: '上位得意先' }));
    fireEvent.click(screen.getByRole('button', { name: /CSV出力/ }));
    const [filename2, csv2] = downloadCsvMock.mock.calls[1];
    expect(filename2).toBe('上位得意先.csv');
    expect(csv2).toContain('1,A000001,サンプル歯科,営業太郎,300000,50000');
  });
});
