import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClinicActivityFeed from './ClinicActivityFeed';

const fetchMock = vi.fn();

function jsonResponse(data: unknown) {
  return Promise.resolve({ ok: true, json: async () => data });
}

const visit = {
  id: 'v1',
  customer_code: 'A000001',
  visit_date: '2026-07-01',
  purpose: '定期訪問',
  memo: null,
  next_visit_date: null,
  created_by: null,
  created_at: '2026-07-01T00:00:00Z',
};

const inquiry = {
  id: 'inq-1',
  customer_code: 'A000001',
  subject: '在庫について',
  body: '在庫が不足しています',
  status: '未対応',
  created_by: '受付太郎',
  slack_notified_at: null,
  created_at: '2026-07-10T00:00:00Z',
  updated_at: '2026-07-10T00:00:00Z',
  replies: [],
};

describe('ClinicActivityFeed', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('訪問記録・問い合わせが両方0件なら空メッセージを表示する', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/visits')) return jsonResponse({ visits: [] });
      return jsonResponse({ inquiries: [] });
    });
    render(<ClinicActivityFeed customerCode="A000001" />);
    expect(await screen.findByText('行動履歴はまだありません')).toBeInTheDocument();
  });

  it('訪問記録と問い合わせを日付降順にマージして表示する', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/visits')) return jsonResponse({ visits: [visit] });
      return jsonResponse({ inquiries: [inquiry] });
    });
    render(<ClinicActivityFeed customerCode="A000001" />);
    expect(await screen.findByText('在庫について')).toBeInTheDocument();
    expect(screen.getByText('定期訪問')).toBeInTheDocument();
    const cards = screen.getAllByText(/問い合わせ|^訪問$/);
    // 問い合わせ（7/10）の方が訪問記録（7/1）より新しいため先に表示される
    expect(cards[0].textContent).toBe('問い合わせ');
  });

  it('問い合わせカードに返信件数と詳細リンクを表示する', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/visits')) return jsonResponse({ visits: [] });
      return jsonResponse({
        inquiries: [{ ...inquiry, replies: [{ id: 'r1', inquiry_id: 'inq-1', author_name: '営業太郎', author_email: 'x', body: 'y', created_at: '2026-07-11T00:00:00Z' }] }],
      });
    });
    render(<ClinicActivityFeed customerCode="A000001" />);
    expect(await screen.findByText(/返信1件/)).toBeInTheDocument();
    const link = screen.getByText('詳細・返信 →');
    expect(link.closest('a')).toHaveAttribute('href', '/bgj/inquiries/inq-1');
  });

  it('refreshKeyが変わると再fetchする', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ visits: [], inquiries: [] }));
    const { rerender } = render(<ClinicActivityFeed customerCode="A000001" refreshKey={1} />);
    await screen.findByText('行動履歴はまだありません');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    rerender(<ClinicActivityFeed customerCode="A000001" refreshKey={2} />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  });
});
