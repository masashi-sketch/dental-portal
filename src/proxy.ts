import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: unknown }) => {
  const isAuthenticated = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPath = pathname.startsWith("/auth");
  const isApiAuth = pathname.startsWith("/api/auth");

  if (isApiAuth) return NextResponse.next();
  if (isAuthPath) return NextResponse.next();

  // 未認証 → Google認証へ
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // 認証済みでもポータル未選択 → ポータル選択画面へ
  const portalSelected = req.cookies.get("portal-selected")?.value;
  if (!portalSelected) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
