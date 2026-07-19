import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout } from './fetchWithTimeout';

// 実fetchのsignal挙動を模した簡易モック：signalがabortされたらAbortErrorでreject、
// されなければ指定したレスポンスでresolveする（応答は次のマイクロタスクで返す＝
// abortより先に即resolveしてタイムアウト経路を素通りしないようにする）。
function makeFetchMock(response: Response) {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }
      signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
      queueMicrotask(() => resolve(response));
    });
  });
}

// タイムアウトを検証するためのモック：abortされない限り永遠に解決しない
// （実サーバーが無応答のまま停止している状況を模す）。
function makeNeverRespondingFetchMock() {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }
      signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    });
  });
}

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('タイムアウト前に応答があれば通常どおりResponseを返す', async () => {
    const response = new Response('{}', { status: 200 });
    vi.stubGlobal('fetch', makeFetchMock(response));

    const result = await fetchWithTimeout('/api/test', undefined, 5000);
    expect(result).toBe(response);
  });

  it('timeoutMsを過ぎても応答が無い場合、分かりやすいタイムアウトエラーを投げる', async () => {
    vi.stubGlobal('fetch', makeNeverRespondingFetchMock());

    const promise = fetchWithTimeout('/api/slow', undefined, 5000);
    // rejectを先にハンドルしてからタイマーを進める（unhandled rejection警告回避）
    const assertion = expect(promise).rejects.toThrow('通信がタイムアウトしました');
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });

  it('AbortError以外のエラーはそのまま再スローする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fetchWithTimeout('/api/test', undefined, 5000)).rejects.toThrow('Failed to fetch');
  });
});
