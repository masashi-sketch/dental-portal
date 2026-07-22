import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BgjReceivedOrders from './BgjReceivedOrders';
import type { BgjOrdersResponse } from '@/lib/orderIntegration';

const responseBody: BgjOrdersResponse = {
  orders: [{
    schemaVersion: 1,
    orderId: 'order-12345678',
    externalOrderId: null,
    source: 'internal',
    createdVia: 'clinic_portal',
    syncStatus: 'local',
    syncError: null,
    externalUpdatedAt: null,
    orderedAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
    orderType: 'one_time',
    fulfillmentMethod: 'pickup',
    shippingAddress: null,
    status: 'received',
    nextFulfillmentDate: null,
    clinic: { customerCode: 'A000001', name: '広島中央歯科' },
    patient: { id: 'patient-1', patientNo: 'P000001', name: '患者 花子' },
    lines: [{
      lineId: 'line-1', productId: 'product-1', externalLineItemId: null,
      productName: '商品A', unitPrice: 1200, quantity: 2, lineTotal: 2400,
    }],
    totalAmount: 2400,
  }],
  total: 1,
  page: 1,
  pageSize: 50,
};

const fetchMock = vi.fn();

describe('BgjReceivedOrders', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => responseBody });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('患者注文の医院・患者・商品・金額・業務状態・同期状態を表示する', async () => {
    render(<BgjReceivedOrders />);

    expect((await screen.findAllByText('広島中央歯科')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('患者 花子').length).toBeGreaterThan(0);
    expect(screen.getAllByText('商品A × 2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('¥2,400').length).toBeGreaterThan(0);
    expect(screen.getAllByText('受付済み').length).toBeGreaterThan(0);
    expect(screen.getAllByText('内部管理').length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith('/api/bgj/orders?page=1');
  });

  it('業務状態を変更するとAPIの絞り込み条件へ反映する', async () => {
    render(<BgjReceivedOrders />);
    await screen.findAllByText('広島中央歯科');

    fireEvent.change(screen.getByLabelText('業務状態'), { target: { value: 'received' } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith('/api/bgj/orders?page=1&status=received');
    });
  });

  it('得意先コードと外部注文IDをAPIの完全一致検索へ渡す', async () => {
    render(<BgjReceivedOrders />);
    await screen.findAllByText('広島中央歯科');

    fireEvent.change(screen.getByLabelText('得意先コード'), { target: { value: 'A000001' } });
    fireEvent.change(screen.getByLabelText('外部注文ID'), { target: { value: 'shopify-100' } });
    fireEvent.click(screen.getByRole('button', { name: '検索' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith('/api/bgj/orders?page=1&customerCode=A000001&externalOrderId=shopify-100');
    });
  });
});
