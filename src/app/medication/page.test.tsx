import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MedicationPage from './page';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const diagnosis = {
  diagnosedAt: '2026-01-01',
  memo: null,
  stage: { code: 2, label: 'ステージII', name: '中等度歯周炎', description: '中等度の歯周組織破壊が見られます。' },
  grade: { code: 'B', label: 'グレードB', name: '標準的な進行', description: '' },
};

function stub(diagnosisValue: unknown, showPeriodontalDiagnosis = true, orders: unknown[] = []) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/clinic-branding')) return jsonResponse({ displayName: 'テスト歯科', nav: {}, showPeriodontalDiagnosis });
    if (url.includes('/diagnosis')) return jsonResponse({ diagnosis: diagnosisValue });
    if (url.includes('/orders')) return jsonResponse({ orders });
    throw new Error(`unexpected fetch: ${url}`);
  });
}

describe('MedicationPage 先生のおすすめへの導線', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('診断結果がある場合、結果を踏まえた文言で/shopへのリンクを表示する', async () => {
    stub(diagnosis);
    render(<MedicationPage />);

    const link = await screen.findByRole('link', { name: 'この結果を踏まえたおすすめのケア用品を見る' });
    expect(link).toHaveAttribute('href', '/shop');
  });

  it('診断結果が無い場合、一般的な文言で/shopへのリンクを表示する', async () => {
    stub(null);
    render(<MedicationPage />);

    const link = await screen.findByRole('link', { name: 'おすすめのケア用品を見る' });
    expect(link).toHaveAttribute('href', '/shop');
  });

  it('歯周病表示設定がOFFの医院では導線ごと表示しない', async () => {
    stub(diagnosis, false);
    render(<MedicationPage />);

    await screen.findByText('サプリメントの受け取り状況');
    expect(screen.queryByRole('link', { name: /おすすめのケア用品を見る/ })).not.toBeInTheDocument();
  });

  it('医院が登録した注文商品と受け取り進捗を表示する', async () => {
    stub(null, true, [{
      id: 'order-1', fulfillment_method: 'pickup', status: 'ready', ordered_at: '2026-07-20T00:00:00Z',
      items: [{
        id: 'item-1', product_name: 'マスタ登録サプリ', quantity: 2, unit_snapshot: '箱',
        image_type_snapshot: 'supplement', daily_amount_snapshot: '1日1粒', volume_snapshot: '30粒',
        caution_snapshot: '高温多湿を避けてください。',
      }],
    }]);
    render(<MedicationPage />);

    expect(await screen.findByText('マスタ登録サプリ')).toBeInTheDocument();
    expect(screen.getByText('現在の状態：準備完了')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === '数量：2箱')).toBeInTheDocument();
  });
});
