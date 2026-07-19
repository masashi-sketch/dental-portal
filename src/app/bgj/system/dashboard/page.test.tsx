import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BgjSystemDashboardPage from './page';
import type { SystemDashboardResponse } from '@/app/api/bgj/system/dashboard/route';
import type { SentryIssuesResponse } from '@/app/api/bgj/system/sentry-issues/route';

const fetchMock = vi.fn();

const DASHBOARD_RESPONSE: SystemDashboardResponse = {
  clinics: {
    total: 12,
    unset: 1,
    byStatus: [
      { id: 'status-1', name: '活性', color: 'emerald', count: 10 },
      { id: 'status-2', name: '休眠', color: 'amber', count: 1 },
    ],
  },
  clinicUsers: { total: 20, active: 18, locked: 2 },
  patients: { total: 300, active: 290, locked: 3, qrRegistered: 150 },
  inquiries: { open: 5 },
};

function stubResponses(options?: {
  dashboard?: SystemDashboardResponse;
  sentry?: SentryIssuesResponse;
  dbUsage?: { totalBytes: number };
  failDashboard?: boolean;
  failDbUsage?: boolean;
}) {
  fetchMock.mockImplementation((url: string) => {
    if (url === '/api/bgj/system/dashboard') {
      if (options?.failDashboard) return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: async () => options?.dashboard ?? DASHBOARD_RESPONSE });
    }
    if (url === '/api/bgj/system/sentry-issues') {
      return Promise.resolve({ ok: true, json: async () => options?.sentry ?? { configured: false } });
    }
    if (url === '/api/bgj/system/db-usage') {
      if (options?.failDbUsage) return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: async () => options?.dbUsage ?? { totalBytes: 100 * 1024 * 1024 } });
    }
    throw new Error(`unexpected url: ${url}`);
  });
}

describe('BgjSystemDashboardPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('KPIカードに得意先数・医院アカウント数・患者アカウント数・未対応問い合わせ数を表示する', async () => {
    stubResponses();
    render(<BgjSystemDashboardPage />);

    expect(await screen.findByText('12件')).toBeInTheDocument();
    expect(screen.getByText('20件')).toBeInTheDocument();
    expect(screen.getByText('300件')).toBeInTheDocument();
    expect(screen.getByText('うちQR自己登録 150件')).toBeInTheDocument();
    expect(screen.getByText('5件')).toBeInTheDocument();
  });

  it('得意先ステータス内訳をバッジで表示する（未設定件数も含む）', async () => {
    stubResponses();
    render(<BgjSystemDashboardPage />);

    expect(await screen.findByText('活性 10件')).toBeInTheDocument();
    expect(screen.getByText('休眠 1件')).toBeInTheDocument();
    expect(screen.getByText('未設定 1件')).toBeInTheDocument();
  });

  it('Sentryが未設定の場合は「未設定」と表示する', async () => {
    stubResponses({ sentry: { configured: false } });
    render(<BgjSystemDashboardPage />);

    expect(await screen.findByText('未設定')).toBeInTheDocument();
  });

  it('Sentry未解決issueがある場合は件数とアプリ管理へのリンクを表示する', async () => {
    stubResponses({ sentry: { configured: true, unresolvedCount: 3, issues: [] } });
    render(<BgjSystemDashboardPage />);

    expect(await screen.findByText('詳細へ')).toHaveAttribute('href', '/bgj/system/apps');
  });

  it('DB容量の使用率を表示する', async () => {
    stubResponses({ dbUsage: { totalBytes: 250 * 1024 * 1024 } });
    render(<BgjSystemDashboardPage />);

    expect(await screen.findByText('50%')).toBeInTheDocument();
  });

  it('ダッシュボードAPIの取得に失敗した場合はエラーメッセージを表示する', async () => {
    stubResponses({ failDashboard: true });
    render(<BgjSystemDashboardPage />);

    expect(await screen.findByText('システムダッシュボードの取得に失敗しました')).toBeInTheDocument();
  });

  it('DB容量の取得に失敗してもダッシュボード全体は表示され、DB容量欄だけフォールバック表示になる', async () => {
    stubResponses({ failDbUsage: true });
    render(<BgjSystemDashboardPage />);

    expect(await screen.findByText('12件')).toBeInTheDocument();
    expect(screen.getByText('取得できませんでした')).toBeInTheDocument();
  });
});
