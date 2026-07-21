import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminOrdersPage from './page';

const fetchMock = vi.fn();
const jsonResponse = (data: unknown) => Promise.resolve({ ok: true, json: async () => data });

vi.mock('../components/AdminSidebar', () => ({ default: () => <nav>sidebar</nav> }));

describe('AdminOrdersPage', () => {
  beforeEach(() => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/admin/orders/bootstrap') return jsonResponse({ orders: [{
        id: 'order-1', ordered_at: '2026-07-20T00:00:00Z', status: 'received',
        fulfillment_method: 'pickup', source: 'internal', patient: { id: 'patient-1', name: '実患者' },
        items: [{ id: 'item-1', product_name: '実商品', quantity: 2, unit_price: 1200 }],
      }], patients: [{ id: 'patient-1', name: '実患者', patient_no: 'T-00001', status: '有効' }],
      products: [{ id: 'product-1', name: '実商品', price: 1200, isVisible: true }] });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('固定データではなくAPIの患者注文を表示する', async () => {
    render(<AdminOrdersPage />);
    expect(await screen.findAllByText('実患者')).not.toHaveLength(0);
    expect(screen.getAllByText(/実商品/)).not.toHaveLength(0);
    expect(screen.getAllByText('¥2,400')).not.toHaveLength(0);
    expect(screen.queryByText('患者 A')).not.toBeInTheDocument();
  });
});
