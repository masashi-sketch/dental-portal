import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductsMasterPage from './page';
import type { Product } from '@/lib/supabase/types';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const product: Product = {
  id: 'product-1',
  name: 'オーラルプロバイオティクス 30日分',
  category: 'サプリメント',
  description: '口腔内の善玉菌を増やす乳酸菌サプリ。',
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
  working_point: '口腔内フローラを整える',
  daily_amount: '1日1粒',
  recommendation_level: '◎',
  doctor_comment: 'まず最初にご案内しているサプリです。',
  status: '公開',
  sort_order: 10,
  created_at: '',
  updated_at: '',
};

describe('ProductsMasterPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('登録済み商品の一覧をバッジ・ステータス付きで表示する', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ products: [product] }));
    render(<ProductsMasterPage />);
    expect(await screen.findByText('オーラルプロバイオティクス 30日分')).toBeInTheDocument();
    expect(screen.getByText('¥3,980')).toBeInTheDocument();
    expect(screen.getByText('歯科医推奨')).toBeInTheDocument();
    expect(screen.getByText('公開')).toBeInTheDocument();
  });

  it('0件のときは案内文を表示する', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ products: [] }));
    render(<ProductsMasterPage />);
    expect(await screen.findByText('商品がまだ登録されていません')).toBeInTheDocument();
  });

  it('商品名・価格が未入力のまま追加すると警告し、POSTしない', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ products: [] }));
    render(<ProductsMasterPage />);
    await screen.findByText('商品がまだ登録されていません');

    fireEvent.click(screen.getByText('商品を追加'));
    fireEvent.click(screen.getByText('追加'));
    expect(await screen.findByText('商品名と価格を入力してください')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit)?.method === 'POST')).toHaveLength(0);
  });

  it('必須項目を入力して追加するとPOSTが飛ぶ', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return jsonResponse({ product }, true);
      return jsonResponse({ products: [] });
    });
    render(<ProductsMasterPage />);
    await screen.findByText('商品がまだ登録されていません');

    fireEvent.click(screen.getByText('商品を追加'));
    fireEvent.change(screen.getByPlaceholderText('例）オーラルプロバイオティクス 30日分'), { target: { value: '新しいサプリ' } });
    fireEvent.change(screen.getByPlaceholderText('例）3980'), { target: { value: '2000' } });
    fireEvent.click(screen.getByText('追加'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/bgj/products',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    const postCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'POST');
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.name).toBe('新しいサプリ');
    expect(body.price).toBe(2000);
  });

  it('編集を開くと既存値がフォームに入り、更新でPATCHが飛ぶ', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') return jsonResponse({ product }, true);
      return jsonResponse({ products: [product] });
    });
    render(<ProductsMasterPage />);
    await screen.findByText('オーラルプロバイオティクス 30日分');

    fireEvent.click(screen.getByText('編集'));
    expect(screen.getByDisplayValue('オーラルプロバイオティクス 30日分')).toBeInTheDocument();
    expect(screen.getByDisplayValue('まず最初にご案内しているサプリです。')).toBeInTheDocument();
    fireEvent.click(screen.getByText('更新する'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/bgj/products/product-1',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });
});
