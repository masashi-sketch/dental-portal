// BGJポータルの得意先詳細ページ「医院ポータルを開く（ビュー）」ボタンがセットする
// bgj-viewing-customer-code cookieを、クライアント側で読むための共有ヘルパー。
// サーバー側の対（resolveScopedCustomerCodeのcookieフォールバック）は
// src/lib/auth/clinicScope.ts が cookies() 経由で読む。

export function readBgjViewingCustomerCode(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )bgj-viewing-customer-code=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
