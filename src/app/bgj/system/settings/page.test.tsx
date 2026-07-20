import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BgjSystemSettingsPage from './page';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const defaultSettings = {
  configured: false,
  webhookUrlPreview: null,
  dashboardFollowupDays: 60,
  dashboardDormantDays: 90,
  dashboardIncludeNeverOrdered: true,
  reportPeriodMonths: 6,
};

describe('BgjSystemSettingsPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('未設定なら「未設定」バッジを表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse(defaultSettings));
    render(<BgjSystemSettingsPage />);
    expect(await screen.findByText('未設定')).toBeInTheDocument();
  });

  it('設定済みならマスク済みプレビューを表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ ...defaultSettings, configured: true, webhookUrlPreview: '...klmnop' }));
    render(<BgjSystemSettingsPage />);
    expect(await screen.findByText('設定済み（...klmnop）')).toBeInTheDocument();
  });

  it('入力して保存するとPATCHし、成功トーストを表示して入力欄をクリアする', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse(defaultSettings);
      return jsonResponse({ ok: true });
    });
    render(<BgjSystemSettingsPage />);
    await screen.findByText('未設定');
    const input = screen.getByPlaceholderText('https://hooks.slack.com/services/...');
    fireEvent.change(input, { target: { value: 'https://hooks.slack.com/services/new' } });
    fireEvent.click(screen.getAllByRole('button', { name: '保存する' })[0]);
    expect(await screen.findByText('設定を保存しました')).toBeInTheDocument();
    expect(input).toHaveValue('');
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
      webhookUrl: 'https://hooks.slack.com/services/new',
    });
  });

  it('保存失敗時はエラーメッセージをトースト表示する', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse(defaultSettings);
      return jsonResponse({ error: '保存できませんでした' }, false);
    });
    render(<BgjSystemSettingsPage />);
    await screen.findByText('未設定');
    fireEvent.click(screen.getAllByRole('button', { name: '保存する' })[0]);
    expect(await screen.findByText('保存できませんでした')).toBeInTheDocument();
  });

  it('取得した閾値を入力欄に反映する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({
      ...defaultSettings,
      dashboardFollowupDays: 45,
      dashboardDormantDays: 75,
      reportPeriodMonths: 12,
    }));
    render(<BgjSystemSettingsPage />);
    expect(await screen.findByDisplayValue('45')).toBeInTheDocument();
    expect(screen.getByDisplayValue('75')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12')).toBeInTheDocument();
  });

  it('ダッシュボード・レポート設定を保存するとPATCHで4項目を送信する', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse(defaultSettings);
      return jsonResponse({ ok: true });
    });
    render(<BgjSystemSettingsPage />);
    await screen.findByText('未設定');
    const followupInput = screen.getByDisplayValue('60');
    fireEvent.change(followupInput, { target: { value: '30' } });
    fireEvent.click(screen.getAllByRole('button', { name: '保存する' })[1]);
    expect(await screen.findByText('設定を保存しました')).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
      dashboardFollowupDays: 30,
      dashboardDormantDays: 90,
      dashboardIncludeNeverOrdered: true,
      reportPeriodMonths: 6,
    });
  });
});
