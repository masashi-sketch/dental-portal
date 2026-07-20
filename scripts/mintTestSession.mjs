// レスポンス計測スクリプト専用：BGJロールのテストセッションCookieを直接発行する。
// Google OAuth画面の自動操作は行わない（信頼性・利用規約の両面で避ける）。
// 代わりに、アプリ本体（src/auth.ts）が使うのと同じAUTH_SECRETでNextAuthの
// セッションJWEを直接生成し、ブラウザへ注入する（next-auth/jwtのencode()を使用、
// アプリ本体のコードは一切変更しない）。
// 安全対策として、localhost/127.0.0.1以外のURLに対しては必ず例外を投げる
// （本番や共有環境へ誤って使うと実質的にGoogle OAuth制限のバイパスになるため）。
import { encode } from 'next-auth/jwt';

export const SESSION_COOKIE_NAME = 'authjs.session-token';

export function assertLocalBaseUrl(baseUrl) {
  let hostname;
  try {
    hostname = new URL(baseUrl).hostname;
  } catch {
    throw new Error(`不正なURLです: ${baseUrl}`);
  }
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    throw new Error(
      `テストセッションの直接発行はlocalhost限定です（本番・リモートURLへの使用は禁止）。指定されたURL: ${baseUrl}`,
    );
  }
}

export async function mintBgjSessionCookie({ baseUrl, secret, email, name }) {
  assertLocalBaseUrl(baseUrl);
  if (!secret) {
    throw new Error('AUTH_SECRET が未設定です（.env.local を --env-file で読み込んでください）');
  }

  const value = await encode({
    token: {
      name,
      email,
      picture: null,
      sub: `e2e-test-${email}`,
      role: 'bgj',
      customerCode: null,
      patientId: null,
    },
    secret,
    salt: SESSION_COOKIE_NAME,
  });

  return {
    name: SESSION_COOKIE_NAME,
    value,
    url: baseUrl,
    httpOnly: true,
    sameSite: 'Lax',
  };
}
