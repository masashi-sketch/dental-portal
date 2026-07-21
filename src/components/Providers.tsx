"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // タブへ戻るたびに全画面共通の/api/auth/sessionを再取得しない。
  // 各APIはサーバー側で毎回セッションを検証するため、認可はこのクライアント設定に依存しない。
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  );
}
