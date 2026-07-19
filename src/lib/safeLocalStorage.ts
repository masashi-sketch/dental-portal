// localStorageへの直接アクセスは、Safariのプライベートブラウジング等の環境で
// 例外（SecurityError/QuotaExceededError）を投げることがある。try-catchで包み、
// 失敗時は「未読バッジが出ない」程度の軽微な劣化に留め、画面全体を壊さない。
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 書き込み失敗は無視する（プライベートブラウジング・ストレージ容量超過等）
  }
}
