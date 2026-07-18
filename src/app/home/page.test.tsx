import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const announcement = {
  id: 'ann-1',
  customer_code: 'A000001',
  announcement_date: '2026-07-01',
  tag: '重要' as const,
  text: '休診日のお知らせです',
  status: '公開' as const,
  created_at: '',
  updated_at: '',
};

describe('HomePage お知らせ表示', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/clinic-branding')) return jsonResponse({ displayName: null, nav: {}, showPeriodontalDiagnosis: true });
      if (url.includes('/announcements')) return jsonResponse({ announcements: [announcement] });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('取得したお知らせを表示する（デスクトップ・モバイル両方の欄に反映される）', async () => {
    render(<HomePage />);
    const items = await screen.findAllByText('休診日のお知らせです');
    // デスクトップ用サイドバー内・モバイル用カードの2箇所にAnnouncementListが描画される
    expect(items.length).toBe(2);
  });

  it('0件のときは「お知らせはありません」を表示する', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/clinic-branding')) return jsonResponse({ displayName: null, nav: {}, showPeriodontalDiagnosis: true });
      if (url.includes('/announcements')) return jsonResponse({ announcements: [] });
      throw new Error(`unexpected fetch: ${url}`);
    });
    render(<HomePage />);
    const items = await screen.findAllByText('お知らせはありません');
    expect(items.length).toBe(2);
  });

  it('取得失敗時はお知らせ欄を表示しない（ホーム画面の他機能には影響しない）', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/clinic-branding')) return jsonResponse({ displayName: null, nav: {}, showPeriodontalDiagnosis: true });
      if (url.includes('/announcements')) return Promise.resolve({ ok: false, json: async () => ({}) });
      throw new Error(`unexpected fetch: ${url}`);
    });
    render(<HomePage />);
    expect(await screen.findByText('メニュー')).toBeInTheDocument();
    expect(screen.queryByText('お知らせはありません')).not.toBeInTheDocument();
  });
});
