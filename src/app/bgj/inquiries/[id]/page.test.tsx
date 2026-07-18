import { act, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BgjInquiryDetailPage from './page';

// use(params)がSuspenseをトリガーするため、ルートツリーが自動で提供する
// Suspense境界をテストでも明示的に用意する。renderの初回サスペンド〜再開までの
// マイクロタスクをactで明示的に待たないと、初回だけ描画前にクエリしてしまう。
async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <BgjInquiryDetailPage params={params} />
      </Suspense>,
    );
  });
}

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const baseInquiry = {
  id: 'inq-1',
  customer_code: 'A000001',
  clinicName: '中央歯科クリニック',
  subject: '在庫について',
  body: '在庫が不足しています',
  status: '未対応',
  created_by: '受付太郎',
  slack_notified_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const params = Promise.resolve({ id: 'inq-1' });

describe('BgjInquiryDetailPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('問い合わせ内容・得意先名・ステータスを表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ inquiry: baseInquiry, replies: [] }));
    await renderPage();
    expect(await screen.findByText('在庫について')).toBeInTheDocument();
    expect(screen.getByText('在庫が不足しています')).toBeInTheDocument();
    expect(screen.getByText('中央歯科クリニック')).toBeInTheDocument();
    expect(screen.getByText('未対応')).toBeInTheDocument();
  });

  it('既存の返信一覧を表示する', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        inquiry: baseInquiry,
        replies: [{ id: 'r1', inquiry_id: 'inq-1', author_name: '営業太郎', author_email: 'sales@biogaia.jp', body: '確認します', created_at: '2026-01-02T00:00:00Z' }],
      }),
    );
    await renderPage();
    expect(await screen.findByText('確認します')).toBeInTheDocument();
    expect(screen.getByText('営業太郎')).toBeInTheDocument();
  });

  it('返信を送信するとPOSTし、一覧に追加されてステータスが対応中になる', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ inquiry: baseInquiry, replies: [] });
      return jsonResponse({
        reply: { id: 'r1', inquiry_id: 'inq-1', author_name: '営業太郎', author_email: 'sales@biogaia.jp', body: '対応します', created_at: '2026-01-02T00:00:00Z' },
      }, true);
    });
    await renderPage();
    await screen.findByText('在庫について');
    fireEvent.change(screen.getByPlaceholderText('返信内容を入力してください'), { target: { value: '対応します' } });
    fireEvent.click(screen.getByRole('button', { name: '返信を送信' }));
    expect(await screen.findByText('返信を送信しました')).toBeInTheDocument();
    expect(screen.getByText('対応します')).toBeInTheDocument();
    expect(screen.getByText('対応中')).toBeInTheDocument();
  });

  it('存在しない問い合わせならエラーメッセージを表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ error: '見つかりません' }, false));
    await renderPage();
    expect(await screen.findByText('問い合わせが見つかりません')).toBeInTheDocument();
  });
});
