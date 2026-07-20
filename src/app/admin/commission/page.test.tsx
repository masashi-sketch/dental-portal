import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CommissionPage from './page';
import type { AdminOverview } from '@/lib/adminOverview';

const overview: AdminOverview = {
  generatedAt: '2026-07-20T01:00:00Z',
  counts: { patientCount: 7, publishedAnnouncementCount: 2, activeOrderCount: 3, visibleProductCount: 5 },
  recentOrders: [],
  recentAnnouncements: [],
  commerce: {
    integrationStatus: 'awaiting_shopify',
    commissionRate: 12,
    currentMonth: { internalOrderCount: 2, internalOrderAmount: 3600, confirmedSales: null, confirmedCommission: null },
    monthly: [{
      month: '2026-07', label: '7月', internalOrderCount: 2, internalOrderAmount: 3600,
      confirmedSales: null, confirmedCommission: null,
    }],
    products: [{
      productName: '実商品', quantity: 3, internalOrderAmount: 3600,
      confirmedSales: null, confirmedCommission: null,
    }],
  },
};

vi.mock('../components/AdminSidebar', () => ({ default: () => <nav>sidebar</nav> }));
vi.mock('next/dynamic', () => ({ default: () => () => <div>実データグラフ</div> }));
vi.mock('@/hooks/useAdminOverview', () => ({
  useAdminOverview: () => ({ overview, loading: false, error: null, reload: vi.fn() }),
}));

describe('CommissionPage', () => {
  it('内部注文を参考値として表示し、確定売上・コミッションを未確定のままにする', () => {
    render(<CommissionPage />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('¥3,600')).not.toHaveLength(0);
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('実商品')).toBeInTheDocument();
    expect(screen.getByText('実データグラフ')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('コミッション段階レート')).not.toBeInTheDocument();
  });
});
