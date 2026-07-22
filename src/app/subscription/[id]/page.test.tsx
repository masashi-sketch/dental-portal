import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SubscriptionOrderPage from './page';

const fetchMock = vi.fn();
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'product-1' }) }));

describe('SubscriptionOrderPage', () => {
  beforeEach(() => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/products')) return Promise.resolve({ ok: true, json: async () => ({ products: [{
        id: 'product-1', name: '定期対象商品', description: '説明', price: 3000, unit: '箱',
        image_type: 'supplement', subscription_available: true, volume: '30粒',
      }] }) });
      if (url.includes('/clinic-branding')) return Promise.resolve({ ok: true, json: async () => ({ displayName: 'テスト医院', nav: {} }) });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('Shopify接続前はシミュレーションのみで申込完了にしない', async () => {
    render(<SubscriptionOrderPage />);
    fireEvent.click(await screen.findByRole('button', { name: /3ヶ月コース/ }));
    fireEvent.click(screen.getByRole('button', { name: /次へ：お届け先/ }));
    fireEvent.click(screen.getByRole('button', { name: /医院で受け取り/ }));
    fireEvent.click(screen.getByRole('button', { name: /次へ：内容を確認/ }));

    const button = screen.getByRole('button', { name: 'Shopify接続後にお申し込みいただけます' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/現時点では契約・決済・注文は作成されません/)).toBeInTheDocument();
    expect(screen.queryByText(/お申し込みが完了しました/)).not.toBeInTheDocument();
  });

  it('自宅受け取りを選択して配送先を確認できる', async () => {
    render(<SubscriptionOrderPage />);
    fireEvent.click(await screen.findByRole('button', { name: /3ヶ月コース/ }));
    fireEvent.click(screen.getByRole('button', { name: /次へ：お届け先/ }));
    fireEvent.click(screen.getByRole('button', { name: /ご自宅へお届け/ }));
    fireEvent.change(screen.getByLabelText('郵便番号'), { target: { value: '1000001' } });
    fireEvent.change(screen.getByLabelText('都道府県'), { target: { value: '東京都' } });
    fireEvent.change(screen.getByLabelText('市区町村'), { target: { value: '千代田区' } });
    fireEvent.change(screen.getByLabelText('番地'), { target: { value: '千代田1-1' } });
    fireEvent.change(screen.getByLabelText('受取人名'), { target: { value: '患者 花子' } });
    fireEvent.change(screen.getByLabelText('電話番号'), { target: { value: '090-1234-5678' } });
    fireEvent.click(screen.getByRole('button', { name: /次へ：内容を確認/ }));
    expect(screen.getByText('ご自宅へお届け')).toBeInTheDocument();
    expect(screen.getByText('〒100-0001 東京都千代田区千代田1-1')).toBeInTheDocument();
  });
});
