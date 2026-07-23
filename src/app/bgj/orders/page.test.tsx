import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OrdersPage from './page';

vi.mock('./BgjReceivedOrders', () => ({ default: () => <div>患者注文の実データ一覧</div> }));
vi.mock('./BgjSubscriptionRequests', () => ({ default: () => <div>定期購入申込の実データ一覧</div> }));

describe('OrdersPage', () => {
  it('受注一覧では患者注文の実データ一覧を表示する', async () => {
    render(await OrdersPage({ searchParams: Promise.resolve({ view: 'received' }) }));

    expect(screen.getByRole('heading', { name: '受注一覧' })).toBeInTheDocument();
    expect(screen.getByText('患者注文の実データ一覧')).toBeInTheDocument();
  });

  it('発注一覧へ切り替えられる', async () => {
    render(await OrdersPage({ searchParams: Promise.resolve({ view: 'purchase' }) }));
    expect(screen.getByRole('heading', { name: '発注一覧' })).toBeInTheDocument();
    expect(screen.getByText('仕入先との連携仕様確定後に実装します')).toBeInTheDocument();
  });

  it('定期購入申込一覧へ切り替えられる', async () => {
    render(await OrdersPage({ searchParams: Promise.resolve({ view: 'subscriptions' }) }));
    expect(screen.getByRole('heading', { name: '定期購入申込' })).toBeInTheDocument();
    expect(screen.getByText('定期購入申込の実データ一覧')).toBeInTheDocument();
  });
});
