import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminProductsPage from './page';
import type { Product } from '@/lib/supabase/types';

const useSessionMock = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => useSessionMock(),
}));

vi.mock('@/hooks/useActiveClinic', () => ({
  useActiveClinic: () => ({ clinicName: null, salesRep: null, loaded: true }),
}));

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const product: Product & { isVisible: boolean; basePrice: number; wholesaleRate: number; wholesalePrice: number; clinicPrice: number; threeMonthPrice: number; sixMonthPrice: number } = {
  id: 'product-1',
  name: 'オーラルプロバイオティクス 30日分',
  product_code: null,
  category: 'お口と喉のケア',
  description: null,
  price: 3980,
  unit: '本',
  image_type: 'supplement',
  image_url: 'https://example.supabase.co/storage/v1/object/public/product-images/product.png',
  badge: '歯科医推奨',
  badge_color: 'indigo',
  subscription_available: true,
  volume: null,
  ingredients: null,
  how_to_use: null,
  caution: null,
  working_point: null,
  daily_amount: null,
  recommendation_level: null,
  doctor_comment: null,
  status: '公開',
  sort_order: 10,
  created_at: '',
  updated_at: '',
  isVisible: true,
  basePrice: 3980,
  wholesaleRate: 60,
  wholesalePrice: 2388,
  clinicPrice: 3980,
  threeMonthPrice: 3780,
  sixMonthPrice: 3580,
};

describe('AdminProductsPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/bgj/external-links') return jsonResponse({ externalLinks: [] });
      if (url === '/api/admin/product-settings' && !init?.method) {
        return jsonResponse({ products: [product] });
      }
      if (url === '/api/admin/product-settings' && init?.method === 'PATCH') {
        const body = JSON.parse(init.body as string);
        return jsonResponse({
          setting: {
            customer_code: 'A000001', product_id: body.productId, is_visible: body.isVisible,
            clinic_price: body.clinicPrice, subscription_3_month_price: body.threeMonthPrice,
            subscription_6_month_price: body.sixMonthPrice, updated_at: '',
          },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clinicロールでなければ一覧を表示せず案内文を出す', () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'bgj' } }, status: 'authenticated' });
    render(<AdminProductsPage />);
    expect(screen.getByText('この画面はクリニックログイン専用です')).toBeInTheDocument();
    // 一覧取得のfetchも行わない
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/admin/product-settings')).toBe(false);
  });

  it('clinicロールなら公開商品の一覧を表示する', async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'clinic' } }, status: 'authenticated' });
    render(<AdminProductsPage />);
    expect(await screen.findByText('オーラルプロバイオティクス 30日分')).toBeInTheDocument();
    expect(screen.getByTestId('product-visual')).toHaveAttribute('src', product.image_url);
    expect(screen.getByText('¥2,388')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /医院通常価格/ })).toHaveValue(3980);
    expect(screen.getByRole('spinbutton', { name: /3ヶ月価格/ })).toHaveValue(3780);
    expect(screen.getByRole('spinbutton', { name: /6ヶ月価格/ })).toHaveValue(3580);
    expect(screen.getByText('現在 60%')).toBeInTheDocument();
    expect(screen.getByText('表示')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '変更を保存' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
  });

  it('トグルをクリックするとPATCHが飛び、表示状態が切り替わる（楽観的更新）', async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'clinic' } }, status: 'authenticated' });
    render(<AdminProductsPage />);
    await screen.findByText('オーラルプロバイオティクス 30日分');

    fireEvent.click(screen.getByRole('button', { name: 'オーラルプロバイオティクス 30日分の表示切替' }));

    await waitFor(() => {
      expect(screen.getByText('非表示')).toBeInTheDocument();
    });
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
      productId: 'product-1',
      isVisible: false,
      clinicPrice: 3980,
      threeMonthPrice: 3780,
      sixMonthPrice: 3580,
    });
  });

  it('医院通常価格と期間別価格を変更して保存できる', async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'clinic' } }, status: 'authenticated' });
    render(<AdminProductsPage />);
    const input = await screen.findByRole('spinbutton', { name: /医院通常価格/ });
    fireEvent.change(input, { target: { value: '4200' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /3ヶ月価格/ }), { target: { value: '3900' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /6ヶ月価格/ }), { target: { value: '3600' } });
    fireEvent.click(screen.getByRole('button', { name: '変更を保存（1件）' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/product-settings', expect.objectContaining({ method: 'PATCH' })));
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toMatchObject({ clinicPrice: 4200, threeMonthPrice: 3900, sixMonthPrice: 3600 });
  });
});
