"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, Suspense } from "react";

const PORTALS = [
  {
    id: "patient",
    label: "患者様ポータル",
    description: "患者様向けサービス",
    href: "/",
    color: "from-sky-500 to-blue-500",
    bg: "bg-sky-50 hover:bg-sky-100 border-sky-200 hover:border-sky-400",
    text: "text-sky-700",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: "clinic",
    label: "医院用ポータル",
    description: "歯科医院向けサービス",
    href: "/clinic-login",
    color: "from-teal-500 to-emerald-500",
    bg: "bg-teal-50 hover:bg-teal-100 border-teal-200 hover:border-teal-400",
    text: "text-teal-700",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: "bgj",
    label: "BGJ用ポータル",
    description: "バイオガイア社員向け",
    href: "/bgj-login",
    color: "from-violet-500 to-purple-500",
    bg: "bg-violet-50 hover:bg-violet-100 border-violet-200 hover:border-violet-400",
    text: "text-violet-700",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function setPortalCookie() {
  // セッションCookie（ブラウザを閉じたらリセット）
  document.cookie = "portal-selected=true; path=/; SameSite=Lax";
}

function SignInContent() {
  const [selected, setSelected] = useState(PORTALS[0]);
  const { data: session, status } = useSession();
  const router = useRouter();
  // セッションが存在していても、選択中のポータルのロールと一致する場合のみ「入る」ボタンにする。
  // 例えば医院用ポータルにログイン済みのままBGJ用ポータルを選んだ場合は、
  // 別ロールなので再度Google認証を要求する（役割不一致のまま素通りさせない）。
  const isAuthenticatedForSelected = status === "authenticated" && session?.user?.role === selected.id;

  const handleEnter = () => {
    if (selected.id === "clinic" || selected.id === "patient") {
      // 医院用・患者様ポータルはGoogle OAuthを使わず、専用ログイン画面へ
      // （Google認証は@biogaia.jpドメイン限定のため、患者様が選んでも必ず失敗する）
      router.push(selected.href);
      return;
    }
    setPortalCookie();
    if (isAuthenticatedForSelected) {
      // 選択中のポータルのロールで既にGoogle認証済み → 直接ポータルへ
      router.push(selected.href);
    } else {
      // 未認証、または別ロールでログイン済み → Google OAuthをやり直す
      signIn("google", { callbackUrl: selected.href });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-teal-50 to-cyan-100 px-4 py-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-sky-900/10 border border-white/60 p-8 sm:p-10 w-full max-w-md">

        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-teal-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-sky-900 mb-0.5">BioGaia デンタルポータル</h1>
          <p className="text-xs text-slate-400">バイオガイア株式会社 専用サービス</p>
        </div>

        {/* ポータル選択 */}
        <p className="text-xs font-semibold text-slate-400 tracking-widest text-center mb-3">ポータルを選択</p>
        <div className="flex flex-col gap-2.5 mb-7">
          {PORTALS.map((portal) => (
            <button
              key={portal.id}
              onClick={() => setSelected(portal)}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all duration-200 text-left ${portal.bg} ${
                selected.id === portal.id
                  ? "ring-2 ring-offset-1 ring-current shadow-sm scale-[1.01]"
                  : ""
              } ${portal.text}`}
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${portal.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                {portal.icon}
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">{portal.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{portal.description}</p>
              </div>
              {selected.id === portal.id && (
                <svg className="w-5 h-5 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* 入るボタン */}
        {selected.id === "clinic" ? (
          <button
            onClick={handleEnter}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            医院ログイン画面へ →
          </button>
        ) : selected.id === "patient" ? (
          <button
            onClick={handleEnter}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            患者様ログイン画面へ →
          </button>
        ) : isAuthenticatedForSelected ? (
          <button
            onClick={handleEnter}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            「{selected.label}」に入る →
          </button>
        ) : (
          <button
            onClick={handleEnter}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Googleアカウントでログイン
          </button>
        )}

        <p className="text-xs text-slate-400 text-center mt-5">
          {selected.id === "clinic"
            ? "医院ごとに発行されたログインID・パスワードでログインします"
            : selected.id === "patient"
            ? "発行されたログインID・パスワードでログインします"
            : "@biogaia.jp のGoogle Workspaceアカウントが必要です"}
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
