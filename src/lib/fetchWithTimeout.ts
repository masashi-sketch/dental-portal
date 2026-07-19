// 素のfetchにはタイムアウトが無いため、サーバー側の応答が遅延・停止すると
// 画面が「読み込み中」のまま永遠に固まる。デフォルト15秒でAbortControllerにより
// 中断し、分かりやすいエラーメッセージを投げる。
const DEFAULT_TIMEOUT_MS = 15000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('通信がタイムアウトしました。ネットワーク状況を確認して再度お試しください。');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}
