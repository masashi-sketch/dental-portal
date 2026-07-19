import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShopPage from './page';
import type { Product } from '@/lib/supabase/types';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 'product-1',
    name: 'テスト商品',
    category: 'サプリメント',
    description: 'テスト説明文',
    price: 1000,
    unit: '本',
    image_type: 'supplement',
    badge: null,
    badge_color: null,
    subscription_available: false,
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
    ...overrides,
  };
}

const defaultProducts: Product[] = [
  makeProduct({
    id: 'product-1',
    name: 'オーラルプロバイオティクス 30日分',
    subscription_available: true,
    working_point: '口腔内フローラを整える',
    daily_amount: '1日1粒',
    recommendation_level: '◎',
    doctor_comment: '歯周病リスクが気になる患者様に、まずご案内しているサプリです。',
  }),
  makeProduct({
    id: 'product-2',
    name: 'デンタルフロス ミント 50m',
    category: 'オーラルケア',
    image_type: 'oral',
    subscription_available: false,
  }),
];

function stub(staff: unknown[], products: Product[] = defaultProducts) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/clinic-branding')) return jsonResponse({ displayName: 'テスト歯科', nav: {}, showPeriodontalDiagnosis: true });
    if (url.includes('/clinic-intro')) return jsonResponse({ info: null, staff });
    if (url.includes('/api/patient-portal/products')) return jsonResponse({ products });
    throw new Error(`unexpected fetch: ${url}`);
  });
}

describe('ShopPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('院長の名前がバナー・おすすめ一覧の見出しに反映される', async () => {
    stub([{ id: 's1', name: '山田太郎', role_label: '院長', photo_url: null, description: null }]);
    render(<ShopPage />);

    expect(await screen.findAllByText('山田太郎先生より')).toHaveLength(1);
    expect(await screen.findByText('山田太郎先生のおすすめ一覧')).toBeInTheDocument();
  });

  it('院長ラベルが無ければ先頭のスタッフにフォールバックする', async () => {
    stub([{ id: 's1', name: '佐藤衛生士', role_label: '歯科衛生士', photo_url: null, description: null }]);
    render(<ShopPage />);

    expect(await screen.findAllByText('佐藤衛生士先生より')).toHaveLength(1);
  });

  it('カート・評価要素が存在しない（EC要素撤去の回帰防止）', async () => {
    stub([]);
    render(<ShopPage />);
    await screen.findAllByText('オーラルプロバイオティクス 30日分');

    expect(screen.queryByText('カートへ追加')).not.toBeInTheDocument();
    expect(screen.queryByText('カートを見る')).not.toBeInTheDocument();
    expect(screen.queryByText(/件\)/)).not.toBeInTheDocument();
  });

  it('APIが返した商品を表示し、推奨度・コメントがある商品だけおすすめ一覧表に載る', async () => {
    stub([]);
    render(<ShopPage />);

    expect(await screen.findAllByText('オーラルプロバイオティクス 30日分')).not.toHaveLength(0);
    expect(screen.getByText('デンタルフロス ミント 50m')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    // ヘッダー行1 + 先生おすすめ入力済みの商品行1（product-2はコメント未入力のため載らない）
    expect(rows).toHaveLength(2);
  });

  it('商品カードに先生の一言コメントを表示する', async () => {
    stub([{ id: 's1', name: '山田太郎', role_label: '院長', photo_url: null, description: null }]);
    render(<ShopPage />);

    expect(await screen.findAllByText(/歯周病リスクが気になる患者様に/)).not.toHaveLength(0);
  });

  it('定期購入対応商品のCTAは/subscriptionへ、それ以外は/clinicへのリンクになる', async () => {
    stub([]);
    render(<ShopPage />);

    const subscriptionLinks = await screen.findAllByRole('link', { name: '定期購入について相談する' });
    expect(subscriptionLinks[0]).toHaveAttribute('href', '/subscription');
    const clinicLinks = screen.getAllByRole('link', { name: '医院に相談する' });
    expect(clinicLinks[0]).toHaveAttribute('href', '/clinic');
  });

  it('商品が0件のときは案内文を表示する', async () => {
    stub([], []);
    render(<ShopPage />);

    expect(await screen.findByText('現在表示できる商品はありません')).toBeInTheDocument();
  });
});
