"use client";

import { SessionProvider } from "next-auth/react";
import PortalModeBanner from "@/components/PortalModeBanner";

export default function Providers({ children }: { children: React.ReactNode }) {
  // セッション取得中も静的な画面骨格は先に描画する。各認証必須ページはuseSessionの
  // loading状態を個別に扱い、全画面を共通ローダーでブロックしない。
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <PortalModeBanner />
      {children}
    </SessionProvider>
  );
}
