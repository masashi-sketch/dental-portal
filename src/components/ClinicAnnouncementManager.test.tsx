import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClinicAnnouncementManager from './ClinicAnnouncementManager';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const existing = {
  id: 'ann-1',
  customer_code: 'A000001',
  announcement_date: '2026-07-01',
  tag: 'お知らせ' as const,
  text: '休診日のお知らせです',
  status: '公開' as const,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

describe('ClinicAnnouncementManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('マウント時に一覧を取得して表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ announcements: [existing] }));
    render(<ClinicAnnouncementManager />);
    expect(await screen.findByText('休診日のお知らせです')).toBeInTheDocument();
    expect(screen.getAllByText('お知らせ').length).toBeGreaterThanOrEqual(2); // 見出し＋タグバッジ
    expect(screen.getByText('公開')).toBeInTheDocument();
  });

  it('0件のときは案内文を表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ announcements: [] }));
    render(<ClinicAnnouncementManager />);
    expect(await screen.findByText('お知らせがまだ登録されていません')).toBeInTheDocument();
  });

  it('customerCode指定時はクエリ付きでfetchし、保存時のbodyにも含める', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ announcements: [] });
      return jsonResponse({ announcement: { ...existing, id: 'ann-2', text: '新しいお知らせ' } }, true);
    });
    render(<ClinicAnnouncementManager customerCode="A000001" />);
    await screen.findByText('お知らせがまだ登録されていません');
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/clinic-announcements?customerCode=A000001');

    fireEvent.click(screen.getByRole('button', { name: '＋ 追加' }));
    fireEvent.change(screen.getByPlaceholderText('お知らせの内容を入力'), { target: { value: '新しいお知らせ' } });
    fireEvent.click(screen.getByRole('button', { name: '追加する' }));

    expect(await screen.findByText('お知らせを追加しました')).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'POST');
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.customerCode).toBe('A000001');
    expect(body.text).toBe('新しいお知らせ');
  });

  it('編集すると内容が更新される', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ announcements: [existing] });
      return jsonResponse({ announcement: { ...existing, text: '編集後の内容' } }, true);
    });
    render(<ClinicAnnouncementManager />);
    await screen.findByText('休診日のお知らせです');
    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    const textarea = screen.getByPlaceholderText('お知らせの内容を入力');
    fireEvent.change(textarea, { target: { value: '編集後の内容' } });
    fireEvent.click(screen.getByRole('button', { name: '更新する' }));
    expect(await screen.findByText('お知らせを更新しました')).toBeInTheDocument();
    expect(screen.getByText('編集後の内容')).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    expect(patchCall![0]).toBe('/api/admin/clinic-announcements/ann-1');
  });

  it('削除確認ダイアログで確定すると一覧から消える', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ announcements: [existing] });
      if (init.method === 'DELETE') return jsonResponse({ ok: true });
      throw new Error('unexpected call');
    });
    render(<ClinicAnnouncementManager />);
    await screen.findByText('休診日のお知らせです');
    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));
    expect(await screen.findByText('お知らせを削除しました')).toBeInTheDocument();
    expect(screen.queryByText('休診日のお知らせです')).not.toBeInTheDocument();
  });
});
