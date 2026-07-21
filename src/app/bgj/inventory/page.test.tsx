import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import InventoryPage from './page';

describe('InventoryPage', () => {
  it('在庫一覧では架空の在庫数を表示せず準備中と表示する', async () => {
    render(await InventoryPage({ searchParams: Promise.resolve({ view: 'stock' }) }));

    expect(screen.getByRole('heading', { name: '在庫一覧' })).toBeInTheDocument();
    expect(screen.getByText('在庫の正本と運用確定後に実装します')).toBeInTheDocument();
  });

  it('入出庫履歴へ切り替えられる', async () => {
    render(await InventoryPage({ searchParams: Promise.resolve({ view: 'movements' }) }));
    expect(screen.getByRole('heading', { name: '入出庫履歴' })).toBeInTheDocument();
  });
});
