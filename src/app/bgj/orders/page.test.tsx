import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OrdersPage from './page';

describe('OrdersPage', () => {
  it('受注一覧では未接続データを作らず準備中と表示する', async () => {
    render(await OrdersPage({ searchParams: Promise.resolve({ view: 'received' }) }));

    expect(screen.getByRole('heading', { name: '受注一覧' })).toBeInTheDocument();
    expect(screen.getByText('外部連携仕様の確定後に実装します')).toBeInTheDocument();
  });

  it('発注一覧へ切り替えられる', async () => {
    render(await OrdersPage({ searchParams: Promise.resolve({ view: 'purchase' }) }));
    expect(screen.getByRole('heading', { name: '発注一覧' })).toBeInTheDocument();
  });
});
