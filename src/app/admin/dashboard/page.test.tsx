import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboard from './page';
import type { AdminOverview } from '@/lib/adminOverview';

const overview: AdminOverview = {
  generatedAt: '2026-07-20T01:00:00Z',
  counts: {
    patientCount: 7,
    publishedAnnouncementCount: 2,
    activeOrderCount: 3,
    visibleProductCount: 5,
  },
  recentOrders: [{
    id: 'order-1',
    orderedAt: '2026-07-20T01:00:00Z',
    fulfillmentMethod: 'pickup',
    status: 'preparing',
    orderType: 'one_time',
    source: 'internal',
    patientName: '実患者',
    productSummary: '実商品 × 2',
  }],
  recentAnnouncements: [{
    id: 'announcement-1',
    announcementDate: '2026-07-20',
    tag: '重要',
    text: '実データのお知らせ',
  }],
  commerce: {
    integrationStatus: 'awaiting_shopify',
    commissionRate: 12,
    currentMonth: { internalOrderCount: 1, internalOrderAmount: 2400, confirmedSales: null, confirmedCommission: null },
    monthly: [],
    products: [],
  },
};

vi.mock('../components/AdminSidebar', () => ({ default: () => <nav>sidebar</nav> }));
vi.mock('@/hooks/useActiveClinic', () => ({ useActiveClinic: () => ({ clinicName: '実医院' }) }));
vi.mock('@/hooks/useAdminOverview', () => ({
  useAdminOverview: () => ({ overview, loading: false, error: null, reload: vi.fn() }),
}));

describe('AdminDashboard', () => {
  it('固定値ではなく集計APIの件数・注文・お知らせを表示する', () => {
    render(<AdminDashboard />);
    expect(screen.getByText('実医院 / 管理ポータル')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('実患者')).toBeInTheDocument();
    expect(screen.getByText(/実商品 × 2/)).toBeInTheDocument();
    expect(screen.getByText('実データのお知らせ')).toBeInTheDocument();
    expect(screen.queryByText('患者 A')).not.toBeInTheDocument();
  });
});
