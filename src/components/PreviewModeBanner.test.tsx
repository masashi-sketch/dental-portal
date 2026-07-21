import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PreviewModeBanner from './PreviewModeBanner';

function clearPreviewCookie() {
  document.cookie = 'demo-patient-id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

describe('PreviewModeBanner', () => {
  beforeEach(clearPreviewCookie);
  afterEach(() => {
    clearPreviewCookie();
    vi.restoreAllMocks();
  });

  it('閉じるを押すとcookieを削除してプレビューを開いたタブを閉じる', async () => {
    document.cookie = 'demo-patient-id=patient-1; path=/';
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    render(<PreviewModeBanner />);
    fireEvent.click(await screen.findByRole('button', { name: '閉じる' }));

    expect(document.cookie).not.toContain('demo-patient-id=patient-1');
    expect(closeSpy).toHaveBeenCalledOnce();
  });
});
