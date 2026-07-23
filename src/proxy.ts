import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { PORTAL_COOKIE } from "@/lib/portalCookies";

const PATIENT_PORTAL_PATHS = ["/home", "/medication", "/shop", "/subscription", "/qa", "/clinic"];

// "/bgj" が "/bgj-login" のような別ページの文字列に誤って一致しないよう、
// パス境界（完全一致 or "/"区切り）で判定する。
function pathIs(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default auth((req: NextRequest & { auth: Session | null }) => {
  const isAuthenticated = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPath = pathname.startsWith("/auth");
  const isApiAuth = pathname.startsWith("/api/auth");
  const isClinicLoginPath = pathname.startsWith("/clinic-login");
  const isBgjLoginPath = pathname.startsWith("/bgj-login");
  const isPatientLoginPath = pathname === "/";
  // クリニックのブランディング（表示名・背景画像URL）だけを返す公開エンドポイント。
  // 患者ポータルのログイン画面（未認証）から呼ぶため認証不要。
  const isPublicClinicBrandingPath = pathname.startsWith("/api/clinics/");
  // 患者様のQR自己登録画面（/join/[slug]、/join/[slug]/mobile）と、その送信先API
  // （/api/join/[slug]）。QRをスマホで読み取って未認証のまま開く前提のため認証不要。
  const isJoinPath = pathname.startsWith("/join/");
  const isJoinApiPath = pathname.startsWith("/api/join/");
  // パスワードを忘れた患者様向けの自己リセット画面・API。ログイン前提のため認証不要。
  const isPasswordResetPath = pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");
  const isPasswordResetApiPath = pathname.startsWith("/api/password-reset");
  // パスワードを忘れた医院スタッフ向けの自己リセット画面・API。上と同じ理由で認証不要。
  const isClinicPasswordResetPath =
    pathname.startsWith("/clinic-forgot-password") || pathname.startsWith("/clinic-reset-password");
  const isClinicPasswordResetApiPath = pathname.startsWith("/api/clinic-password-reset");
  // LINKマスタのGETは医院サイドバーからも利用する。API自身が認証済みセッションを
  // 検証するため、clinicロールをBGJ領域として弾く前に通す。更新系は従来通りBGJ限定。
  const isSharedExternalLinksGet = pathname === "/api/bgj/external-links" && req.method === "GET";
  const isClinicChangePasswordPath = pathIs(pathname, '/clinic-change-password');
  const isClinicChangePasswordApiPath = pathIs(pathname, '/api/clinic-change-password');

  if (isApiAuth) return NextResponse.next();
  if (isAuthPath) return NextResponse.next();
  if (isClinicLoginPath) return NextResponse.next();
  if (isBgjLoginPath) return NextResponse.next();
  if (isPatientLoginPath) return NextResponse.next();
  if (isPublicClinicBrandingPath) return NextResponse.next();
  if (isJoinPath) return NextResponse.next();
  if (isJoinApiPath) return NextResponse.next();
  if (isPasswordResetPath) return NextResponse.next();
  if (isPasswordResetApiPath) return NextResponse.next();
  if (isClinicPasswordResetPath) return NextResponse.next();
  if (isClinicPasswordResetApiPath) return NextResponse.next();

  if (req.auth?.user?.accountDisabled) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    const response = NextResponse.redirect(new URL('/clinic-login?reason=session-expired', req.url));
    response.cookies.delete(PORTAL_COOKIE.selected);
    return response;
  }

  if (req.auth?.user?.role === 'clinic' && req.auth.user.clinicMustChangePassword) {
    if (isClinicChangePasswordPath || isClinicChangePasswordApiPath) return NextResponse.next();
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: '初回パスワード変更が必要です。' }, { status: 403 });
    return NextResponse.redirect(new URL('/clinic-change-password', req.url));
  }

  if (isSharedExternalLinksGet) return NextResponse.next();

  const role = req.auth?.user?.role;
  const isPatientPortalPath = PATIENT_PORTAL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // 患者ポータルのページシェルは実患者と認証済みスタッフに許可する。スタッフの
  // 実データAPIは各Route Handlerがタブ固有の署名トークンを必須にする。
  // sessionStorageはHTTPナビゲーション前に参照できないため、Proxyで判定しない。
  if (isPatientPortalPath) {
    if (role === "patient") return NextResponse.next();
    if (role === "clinic" || role === "bgj") return NextResponse.next();
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 未認証 → ログイン画面へ
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // 認証済みでもポータル未選択 → ポータル選択画面へ
  const portalSelected = req.cookies.get(PORTAL_COOKIE.selected)?.value;
  if (!portalSelected) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // 患者ログインは医院用・BGJポータル領域にアクセス不可
  const isStaffPath =
    pathIs(pathname, "/admin") ||
    pathIs(pathname, "/bgj") ||
    pathIs(pathname, "/api/admin") ||
    pathIs(pathname, "/api/bgj");
  if (role === "patient" && isStaffPath) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // 医院スタッフ（clinic-credentialsログイン）はBGJポータル領域にアクセス不可
  const isBgjPath = pathIs(pathname, "/bgj") || pathIs(pathname, "/api/bgj");
  if (role === "clinic" && isBgjPath) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // 閲覧専用ロールは医院ポータル全体の更新APIを一括で拒否する。
  // 個別Routeの認可と併用し、新規APIの権限チェック漏れも防ぐ。
  if (role === "clinic" && req.auth?.user?.clinicRole === "viewer"
    && pathIs(pathname, "/api/admin") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return NextResponse.json({ error: '閲覧専用アカウントでは更新できません。' }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  // Proxyは認証・権限制御が必要な領域だけで実行する。公開ログイン画面やpublic配下の
  // 画像までauth()を通すと、静的画面でもVercel Functionの起動待ちが発生する。
  // 各Route Handlerも認可を検証するため、Proxyだけに認可を依存しない。
  matcher: [
    "/admin/:path*",
    "/bgj/:path*",
    "/home/:path*",
    "/medication/:path*",
    "/shop/:path*",
    "/subscription/:path*",
    "/qa/:path*",
    "/clinic/:path*",
    "/api/admin/:path*",
    "/api/bgj/:path*",
    "/api/patient-portal/:path*",
    "/api/periodontal/:path*",
    "/clinic-change-password",
    "/api/clinic-change-password",
  ],
};
