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

const product: Product & { isVisible: boolean } = {
  id: 'product-1',
  name: 'オーラルプロバイオティクス 30日分',
  category: 'お口と喉のケア',
  description: null,
  price: 3980,
  unit: '本',
  image_type: 'supplement',
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
          setting: { customer_code: 'A000001', product_id: body.productId, is_visible: body.isVisible, updated_at: '' },
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
    expect(screen.getByText('¥3,980')).toBeInTheDocument();
    expect(screen.getByText('表示')).toBeInTheDocument();
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
    });
  });
});
