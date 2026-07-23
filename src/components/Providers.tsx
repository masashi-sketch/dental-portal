"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import PortalModeBanner from "@/components/PortalModeBanner";
import { bootstrapPortalPreviewFromLocation, installPortalPreviewFetch } from '@/lib/client/portalState';

export default function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  // 子コンポーネントのeffectがAPIを呼ぶ前に、URLからタブ固有のプレビュー状態を復元する。
  bootstrapPortalPreviewFromLocation();
  installPortalPreviewFetch();
  // セッション取得中も静的な画面骨格は先に描画する。各認証必須ページはuseSessionの
  // loading状態を個別に扱い、全画面を共通ローダーでブロックしない。
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <PortalModeBanner />
      {children}
    </SessionProvider>
  );
}
