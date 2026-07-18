import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminSidebar from './AdminSidebar';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'クリニック担当者' } } }),
  signOut: vi.fn(),
}));

vi.mock('@/hooks/useActiveClinic', () => ({
  useActiveClinic: () => ({ clinicName: 'テストデンタル', salesRep: null, loaded: true }),
}));

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const link = {
  id: 'link-1',
  label: 'BiogaiaAcademy',
  url: 'https://biogaia-academy.jp/',
  created_at: '',
  updated_at: '',
};

describe('AdminSidebar 外部リンク（LINKS）', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('BGJが登録した外部リンクを取得して表示する', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ externalLinks: [link] }));
    render(<AdminSidebar active="dashboard" />);
    const items = await screen.findAllByText('BiogaiaAcademy');
    expect(items.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith('/api/bgj/external-links');
  });

  it('リンクが0件のときはLINKS欄自体を表示しない', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ externalLinks: [] }));
    render(<AdminSidebar active="dashboard" />);
    await screen.findAllByText('ダッシュボード');
    expect(screen.queryByText('LINKS')).not.toBeInTheDocument();
  });

  it('取得失敗時もLINKS欄を表示しない（他の機能に影響しない）', async () => {
    fetchMock.mockResolvedValue(Promise.resolve({ ok: false, json: async () => ({}) }));
    render(<AdminSidebar active="dashboard" />);
    await screen.findAllByText('ダッシュボード');
    expect(screen.queryByText('LINKS')).not.toBeInTheDocument();
  });
});
