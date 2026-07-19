import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SubscriptionPage from './page';

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

describe('SubscriptionPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('院長の名前が「継続をおすすめする理由」カードに反映される', async () => {
    stub([{ id: 's1', name: '山田太郎', role_label: '院長', photo_url: null, description: null }]);
    render(<SubscriptionPage />);

    expect(await screen.findByText('山田太郎先生が継続をおすすめする理由')).toBeInTheDocument();
  });

  it('院長ラベルが無ければ先頭のスタッフにフォールバックする', async () => {
    stub([{ id: 's1', name: '佐藤衛生士', role_label: '歯科衛生士', photo_url: null, description: null }]);
    render(<SubscriptionPage />);

    expect(await screen.findByText('佐藤衛生士先生が継続をおすすめする理由')).toBeInTheDocument();
  });

  it('スタッフが1件もいなくても崩れず表示される（医院名ベースのフォールバック）', async () => {
    stub([]);
    render(<SubscriptionPage />);

    expect(await screen.findByText('テスト歯科 院長が継続をおすすめする理由')).toBeInTheDocument();
  });
});
