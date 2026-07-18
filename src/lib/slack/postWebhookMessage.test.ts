// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postWebhookMessage } from './postWebhookMessage';

const fetchMock = vi.fn();

describe('postWebhookMessage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Webhook URLへtextをJSON POSTし、成功時はtrueを返す', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const ok = await postWebhookMessage('https://hooks.slack.com/services/x', 'こんにちは');
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/x',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'こんにちは' }),
      }),
    );
  });

  it('Slack側がエラー応答ならfalseを返す（例外は投げない）', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const ok = await postWebhookMessage('https://hooks.slack.com/services/x', 'テスト');
    expect(ok).toBe(false);
  });

  it('fetch自体が失敗してもfalseを返す（例外は投げない）', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const ok = await postWebhookMessage('https://hooks.slack.com/services/x', 'テスト');
    expect(ok).toBe(false);
  });
});
