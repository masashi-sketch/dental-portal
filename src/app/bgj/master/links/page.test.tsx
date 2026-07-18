import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExternalLinksMasterPage from './page';

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

describe('ExternalLinksMasterPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('登録済みリンクの一覧を表示する', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ externalLinks: [link] }));
    render(<ExternalLinksMasterPage />);
    expect(await screen.findByText('BiogaiaAcademy')).toBeInTheDocument();
    expect(screen.getByText('https://biogaia-academy.jp/')).toBeInTheDocument();
  });

  it('0件のときは案内文を表示する', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ externalLinks: [] }));
    render(<ExternalLinksMasterPage />);
    expect(await screen.findByText('リンクがまだ登録されていません')).toBeInTheDocument();
  });

  it('表示名称とURLを入力して追加できる', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return jsonResponse({ externalLink: link }, true);
      return jsonResponse({ externalLinks: [] });
    });
    render(<ExternalLinksMasterPage />);
    await screen.findByText('リンクがまだ登録されていません');

    fireEvent.click(screen.getByText('リンクを追加'));
    fireEvent.change(screen.getByPlaceholderText('例）BiogaiaAcademy'), { target: { value: 'こどもヘルスラボ' } });
    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://childhealth.jp/' } });
    fireEvent.click(screen.getByText('追加'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/bgj/external-links',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
