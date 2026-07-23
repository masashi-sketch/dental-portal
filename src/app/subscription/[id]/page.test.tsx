import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SubscriptionOrderPage from './page';

const fetchMock = vi.fn();
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'product-1' }) }));

describe('SubscriptionOrderPage', () => {
  beforeEach(() => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/products')) return Promise.resolve({ ok: true, json: async () => ({ products: [{
        id: 'product-1', name: '定期対象商品', description: '説明', price: 3000, unit: '箱',
        image_type: 'supplement', image_url: 'https://example.com/product.png', subscription_available: true, volume: '30粒',
        clinicPrice: 3000, threeMonthPrice: 2800, sixMonthPrice: 2500,
      }] }) });
      if (url.includes('/clinic-branding')) return Promise.resolve({ ok: true, json: async () => ({ displayName: 'テスト医院', nav: {} }) });
      if (url.includes('/clinic-delivery-destinations')) return Promise.resolve({ ok: true, json: async () => ({ destinations: [{
        id: 'clinic-destination-1', patient_id: null, clinic_customer_code: 'clinic-1', label: '本院', postal_code: '730-0001',
        prefecture: '広島県', city: '広島市', address_line1: '中区1-1', address_line2: null,
        recipient_name: 'テスト医院', phone: '082-123-4567', is_default: true, deleted_at: null, created_at: '', updated_at: '',
      }] }) });
      if (url.includes('/delivery-destinations')) return Promise.resolve({ ok: true, json: async () => ({ destinations: [{
        id: 'destination-1', patient_id: 'patient-1', clinic_customer_code: null, label: '自宅', postal_code: '100-0001',
        prefecture: '東京都', city: '千代田区', address_line1: '千代田1-1', address_line2: null,
        recipient_name: '患者 花子', phone: '090-1234-5678', is_default: true, deleted_at: null, created_at: '', updated_at: '',
      }] }) });
      if (url.includes('/subscription-requests')) return Promise.resolve({ ok: true, json: async () => ({ request: { request_number: 12 } }) });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('Shopify契約や実受注を作らず申込審査へ送信する', async () => {
    render(<SubscriptionOrderPage />);
    fireEvent.click(await screen.findByRole('button', { name: /3ヶ月コース/ }));
    fireEvent.click(screen.getByRole('button', { name: /次へ：お届け先/ }));
    fireEvent.click(screen.getByRole('button', { name: /医院で受け取り/ }));
    const nextButton = screen.getByRole('button', { name: /次へ：内容を確認/ });
    await waitFor(() => expect(nextButton).toBeEnabled());
    fireEvent.click(nextButton);

    expect(screen.getByText(/Shopify上の契約・決済・受注はまだ作成されません/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'この内容で申込を送信' }));
    expect(await screen.findByText('定期購入申込を受け付けました')).toBeInTheDocument();
    expect(screen.getByText(/SUB-00000012/)).toBeInTheDocument();
  });

  it('自宅受け取りを選択して配送先を確認できる', async () => {
    render(<SubscriptionOrderPage />);
    fireEvent.click(await screen.findByRole('button', { name: /3ヶ月コース/ }));
    fireEvent.click(screen.getByRole('button', { name: /次へ：お届け先/ }));
    fireEvent.click(screen.getByRole('button', { name: /ご自宅へお届け/ }));
    await screen.findByText('自宅');
    fireEvent.click(screen.getByRole('button', { name: /次へ：内容を確認/ }));
    expect(screen.getByText('ご自宅へお届け')).toBeInTheDocument();
    expect(screen.getByText('〒100-0001 東京都千代田区千代田1-1')).toBeInTheDocument();
    expect(screen.getByText('¥8,400（3ヶ月分）')).toBeInTheDocument();
  });
});
