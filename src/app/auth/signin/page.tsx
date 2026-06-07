"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-teal-50 to-cyan-100 px-4">
      {/* 水彩風の背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-sky-900/10 border border-white/60 p-8 sm:p-12 w-full max-w-md">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-teal-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-sky-900 mb-1">
            BioGaia デンタルポータル
          </h1>
          <p className="text-sm text-slate-500">
            バイオガイア株式会社 社員専用
          </p>
        </div>

        {/* 説明文 */}
        <div className="bg-sky-50/80 border border-sky-200/60 rounded-2xl p-4 mb-8">
          <p className="text-sm text-sky-700 text-center leading-relaxed">
            このサイトは <strong>@biogaia.jp</strong> のGoogleアカウントを
            <br />
            お持ちの方のみアクセスできます。
          </p>
        </div>

        {/* Googleサインインボタン */}
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {/* Googleロゴ */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Googleアカウントでログイン
        </button>

        <p className="text-xs text-slate-400 text-center mt-6">
          biogaia.jp のGoogle Workspaceアカウントが必要です
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
