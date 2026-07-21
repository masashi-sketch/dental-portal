import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductDetailPage from './page';
import type { Product } from '@/lib/supabase/types';

let paramsId = 'product-1';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: paramsId }),
}));

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 'product-1',
    name: 'オーラルプロバイオティクス 30日分',
    product_code: null,
    category: 'お口と喉のケア',
    description: '口腔内の善玉菌を増やす乳酸菌サプリ。',
    price: 3980,
    unit: '本',
    image_type: 'supplement',
    image_url: null,
    badge: '歯科医推奨',
    badge_color: 'indigo',
    subscription_available: true,
    volume: '30粒（約30日分）',
    ingredients: null,
    how_to_use: null,
    caution: null,
    working_point: null,
    daily_amount: null,
    recommendation_level: '◎',
    doctor_comment: 'まず最初にご案内しているサプリです。',
    status: '公開',
    sort_order: 10,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

const products: Product[] = [
  makeProduct({}),
  makeProduct({ id: 'product-2', name: '歯科専用 乳酸菌タブレット 90粒', price: 1980, subscription_available: false, doctor_comment: null }),
];

function stub(productList: Product[] = products) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/clinic-branding')) return jsonResponse({ displayName: 'テスト歯科', nav: {}, showPeriodontalDiagnosis: true });
    if (url.includes('/api/patient-portal/products')) return jsonResponse({ products: productList });
    throw new Error(`unexpected fetch: ${url}`);
  });
}

describe('ProductDetailPage', () => {
  beforeEach(() => {
    paramsId = 'product-1';
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('商品名・価格・先生コメント・入力済みの詳細項目を表示する', async () => {
    stub();
    render(<ProductDetailPage />);

    // 商品名はパンくずと見出しの両方に出る
    expect(await screen.findAllByText('オーラルプロバイオティクス 30日分')).not.toHaveLength(0);
    expect(screen.getByText('¥3,980')).toBeInTheDocument();
    expect(screen.getByText('まず最初にご案内しているサプリです。')).toBeInTheDocument();
    // 入力済みの詳細項目（内容量）は表示され、未入力（成分等）はセクションごと表示されない
    expect(screen.getByText('内容量')).toBeInTheDocument();
    expect(screen.queryByText('成分')).not.toBeInTheDocument();
  });

  it('カート・星評価・送料表記が存在しない（EC要素撤去の回帰防止）', async () => {
    stub();
    render(<ProductDetailPage />);
    await screen.findAllByText('オーラルプロバイオティクス 30日分');

    expect(screen.queryByText(/カートに追加/)).not.toBeInTheDocument();
    expect(screen.queryByText(/件のレビュー/)).not.toBeInTheDocument();
    expect(screen.queryByText(/送料無料/)).not.toBeInTheDocument();
    expect(screen.queryByText('数量')).not.toBeInTheDocument();
  });

  it('定期購入対応商品のCTAは/subscriptionへのリンクになる', async () => {
    stub();
    render(<ProductDetailPage />);

    const link = await screen.findByRole('link', { name: /定期購入について相談する/ });
    expect(link).toHaveAttribute('href', '/subscription');
  });

  it('同じカテゴリの関連商品を表示する', async () => {
    stub();
    render(<ProductDetailPage />);

    expect(await screen.findByText('同じカテゴリの商品')).toBeInTheDocument();
    expect(screen.getByText('歯科専用 乳酸菌タブレット 90粒')).toBeInTheDocument();
  });

  it('一覧に無い商品ID（非表示・非公開・不正ID）は「見つかりません」になる', async () => {
    paramsId = 'no-such-product';
    stub();
    render(<ProductDetailPage />);

    expect(await screen.findByText('商品が見つかりませんでした。')).toBeInTheDocument();
  });
});
