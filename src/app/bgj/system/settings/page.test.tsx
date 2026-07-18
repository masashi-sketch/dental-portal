import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BgjSystemSettingsPage from './page';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

describe('BgjSystemSettingsPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('未設定なら「未設定」バッジを表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ configured: false, webhookUrlPreview: null }));
    render(<BgjSystemSettingsPage />);
    expect(await screen.findByText('未設定')).toBeInTheDocument();
  });

  it('設定済みならマスク済みプレビューを表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ configured: true, webhookUrlPreview: '...klmnop' }));
    render(<BgjSystemSettingsPage />);
    expect(await screen.findByText('設定済み（...klmnop）')).toBeInTheDocument();
  });

  it('入力して保存するとPATCHし、成功トーストを表示して入力欄をクリアする', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ configured: false, webhookUrlPreview: null });
      return jsonResponse({ ok: true });
    });
    render(<BgjSystemSettingsPage />);
    await screen.findByText('未設定');
    const input = screen.getByPlaceholderText('https://hooks.slack.com/services/...');
    fireEvent.change(input, { target: { value: 'https://hooks.slack.com/services/new' } });
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    expect(await screen.findByText('設定を保存しました')).toBeInTheDocument();
    expect(input).toHaveValue('');
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
      webhookUrl: 'https://hooks.slack.com/services/new',
    });
  });

  it('保存失敗時はエラーメッセージをトースト表示する', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ configured: false, webhookUrlPreview: null });
      return jsonResponse({ error: '保存できませんでした' }, false);
    });
    render(<BgjSystemSettingsPage />);
    await screen.findByText('未設定');
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    expect(await screen.findByText('保存できませんでした')).toBeInTheDocument();
  });
});
