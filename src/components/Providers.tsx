"use client";

import { useEffect, useState } from "react";
import { getSession, SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import FullScreenLoading from "@/components/ui/FullScreenLoading";

// SessionProvider自身の初回取得はBroadcastChannel通知を発生させ、同じProviderが
// その通知を受けて再取得する。通知なしの取得を共有し、Strict Modeでも1回に抑える。
let initialSessionPromise: Promise<Session | null> | null = null;

function loadInitialSession() {
  initialSessionPromise ??= getSession({ broadcast: false }).catch(() => null);
  return initialSessionPromise;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [initialSession, setInitialSession] = useState<Session | null>();

  useEffect(() => {
    let active = true;
    void loadInitialSession().then((session) => {
      if (active) setInitialSession(session);
    });
    return () => { active = false; };
  }, []);

  if (initialSession === undefined) return <FullScreenLoading />;

  // タブへ戻るたびに全画面共通の/api/auth/sessionを再取得しない。
  // 各APIはサーバー側で毎回セッションを検証するため、認可はこのクライアント設定に依存しない。
  return (
    <SessionProvider session={initialSession} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  );
}
