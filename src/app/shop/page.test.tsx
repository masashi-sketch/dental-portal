import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShopPage from './page';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function stub(staff: unknown[]) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/clinic-branding')) return jsonResponse({ displayName: 'テスト歯科', nav: {}, showPeriodontalDiagnosis: true });
    if (url.includes('/clinic-intro')) return jsonResponse({ info: null, staff });
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
    expect(screen.getByText('山田太郎先生のおすすめ一覧')).toBeInTheDocument();
  });

  it('院長ラベルが無ければ先頭のスタッフにフォールバックする', async () => {
    stub([{ id: 's1', name: '佐藤衛生士', role_label: '歯科衛生士', photo_url: null, description: null }]);
    render(<ShopPage />);

    expect(await screen.findAllByText('佐藤衛生士先生より')).toHaveLength(1);
  });

  it('カート・評価要素が存在しない（EC要素撤去の回帰防止）', async () => {
    stub([]);
    render(<ShopPage />);
    await screen.findByText('おすすめ商品');

    expect(screen.queryByText('カートへ追加')).not.toBeInTheDocument();
    expect(screen.queryByText('カートを見る')).not.toBeInTheDocument();
    expect(screen.queryByText(/件\)/)).not.toBeInTheDocument();
  });

  it('先生のおすすめ一覧表に全12商品が表示される', async () => {
    stub([]);
    render(<ShopPage />);

    const rows = await screen.findAllByRole('row');
    // ヘッダー行1 + 商品行12
    expect(rows).toHaveLength(13);
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
});
