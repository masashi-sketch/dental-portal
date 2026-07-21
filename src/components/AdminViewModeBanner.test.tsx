import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    vi.restoreAllMocks();
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

  it('閉じるを押すとcookieを削除してビューを開いたタブを閉じる', async () => {
    document.cookie = 'bgj-viewing-customer-code=A000001; path=/';
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    render(<AdminViewModeBanner />);
    await screen.findByText('閉じる');
    fireEvent.click(screen.getByText('閉じる'));

    expect(document.cookie).not.toContain('bgj-viewing-customer-code=A000001');
    expect(closeSpy).toHaveBeenCalledOnce();
  });
});
