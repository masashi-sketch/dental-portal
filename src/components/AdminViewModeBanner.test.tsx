import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminViewModeBanner from './AdminViewModeBanner';

function clearCookies() {
  document.cookie = 'bgj-viewing-customer-code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

describe('AdminViewModeBanner', () => {
  beforeEach(() => {
    clearCookies();
  });

  afterEach(() => {
    clearCookies();
  });

  it('cookieが無ければ何も表示しない', async () => {
    render(<AdminViewModeBanner />);
    await waitFor(() => {
      expect(screen.queryByText(/閲覧モード/)).not.toBeInTheDocument();
    });
  });

  it('cookieがあれば得意先コード付きの閲覧モード表示を出す', async () => {
    document.cookie = 'bgj-viewing-customer-code=A000001; path=/';
    render(<AdminViewModeBanner />);
    expect(await screen.findByText('閲覧モード：得意先コード A000001 を医院ポータルとして閲覧しています')).toBeInTheDocument();
  });

  it('閲覧を終了を押すとcookieを削除して得意先詳細ページへ戻る', async () => {
    document.cookie = 'bgj-viewing-customer-code=A000001; path=/';
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });

    render(<AdminViewModeBanner />);
    await screen.findByText('閲覧を終了');
    fireEvent.click(screen.getByText('閲覧を終了'));

    expect(document.cookie).not.toContain('bgj-viewing-customer-code=A000001');
    expect(window.location.href).toBe('/bgj/customers/A000001');

    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });
});
