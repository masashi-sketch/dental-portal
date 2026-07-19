import { describe, expect, it } from 'vitest';
import { parseJsonResponse } from './parseJsonResponse';

function makeResponse(contentType: string | null, body: unknown) {
  return {
    headers: { get: (key: string) => (key.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  } as unknown as Response;
}

describe('parseJsonResponse', () => {
  it('content-typeがapplication/jsonならそのままパースする', async () => {
    const res = makeResponse('application/json; charset=utf-8', { ok: true });
    await expect(parseJsonResponse(res)).resolves.toEqual({ ok: true });
  });

  it('content-typeがHTML（セッション切り替わりによるリダイレクト等）なら分かりやすいエラーを投げる', async () => {
    const res = makeResponse('text/html; charset=utf-8', '<!DOCTYPE html>...');
    await expect(parseJsonResponse(res)).rejects.toThrow('セッションの状態が変わった可能性があります。ページを再読み込みしてください。');
  });

  it('content-typeが無い場合もエラーを投げる', async () => {
    const res = makeResponse(null, '');
    await expect(parseJsonResponse(res)).rejects.toThrow('セッションの状態が変わった可能性があります');
  });
});
