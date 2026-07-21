import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BillingPage from './page';

describe('BillingPage', () => {
  it('請求一覧では未接続データを作らず準備中と表示する', () => {
    render(<BillingPage />);

    expect(screen.getByRole('heading', { name: '請求一覧' })).toBeInTheDocument();
    expect(screen.getByText('会計・請求フローの確定後に実装します')).toBeInTheDocument();
  });
});
