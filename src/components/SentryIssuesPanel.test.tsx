import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SentryIssuesPanel from './SentryIssuesPanel';
import type { SentryIssuesResponse } from '@/app/api/bgj/system/sentry-issues/route';

const fetchMock = vi.fn();

function stubResponse(body: SentryIssuesResponse) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => body });
}

describe('SentryIssuesPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('未設定（configured:false）なら案内メッセージを表示する', async () => {
    stubResponse({ configured: false });
    render(<SentryIssuesPanel />);
    expect(await screen.findByText('SENTRY_AUTH_TOKENが未設定のため表示できません。')).toBeInTheDocument();
  });

  it('Sentry API側のエラーメッセージを表示する', async () => {
    stubResponse({ configured: true, error: 'Sentryのトークンが無効です' });
    render(<SentryIssuesPanel />);
    expect(await screen.findByText('Sentryのトークンが無効です')).toBeInTheDocument();
  });

  it('未解決issueが0件なら空メッセージを表示する', async () => {
    stubResponse({ configured: true, unresolvedCount: 0, issues: [] });
    render(<SentryIssuesPanel />);
    expect(await screen.findByText('未解決のエラーはありません。')).toBeInTheDocument();
  });

  it('issue一覧をタイトル・件数・レベル付きで表示する', async () => {
    stubResponse({
      configured: true,
      unresolvedCount: 1,
      issues: [
        {
          id: '1',
          shortId: 'DP-1',
          title: 'TypeError: x is not a function',
          culprit: 'src/app/page.tsx',
          level: 'error',
          count: '12',
          lastSeen: '2026-07-18T00:00:00Z',
          permalink: 'https://biogaiajp.sentry.io/issues/1/',
        },
      ],
    });
    render(<SentryIssuesPanel />);
    expect(await screen.findByText('TypeError: x is not a function')).toBeInTheDocument();
    expect(screen.getByText('src/app/page.tsx')).toBeInTheDocument();
    expect(screen.getByText('12件')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
    const link = screen.getByText('TypeError: x is not a function').closest('a');
    expect(link).toHaveAttribute('href', 'https://biogaiajp.sentry.io/issues/1/');
  });
});
