import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

export default auth((req: NextRequest & { auth: Session | null }) => {
  const isAuthenticated = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPath = pathname.startsWith("/auth");
  const isApiAuth = pathname.startsWith("/api/auth");
  const isClinicLoginPath = pathname.startsWith("/clinic-login");

  if (isApiAuth) return NextResponse.next();
  if (isAuthPath) return NextResponse.next();
  if (isClinicLoginPath) return NextResponse.next();

  // 未認証 → ログイン画面へ
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // 認証済みでもポータル未選択 → ポータル選択画面へ
  const portalSelected = req.cookies.get("portal-selected")?.value;
  if (!portalSelected) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // 医院スタッフ（clinic-credentialsログイン）はBGJポータル領域にアクセス不可
  const role = req.auth?.user?.role;
  const isBgjPath = pathname.startsWith("/bgj") || pathname.startsWith("/api/bgj");
  if (role === "clinic" && isBgjPath) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
