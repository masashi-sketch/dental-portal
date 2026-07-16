"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";

type ManagedApp = {
  name: string;
  purpose: string;
  planTier: string;
  requiredEnvVars: string[];
  dashboardUrl: string;
};

// 依存している外部サービス・必要な環境変数の一覧。サービスを追加・変更したら
// このリストも一緒に更新すること（bgj/manualと同様、仕様変更のたびに更新する）。
const MANAGED_APPS: ManagedApp[] = [
  {
    name: "Supabase",
    purpose: "DB・データ格納基盤",
    planTier: "Free",
    requiredEnvVars: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_JWT_SECRET"],
    dashboardUrl: "https://supabase.com/dashboard",
  },
  {
    name: "Vercel",
    purpose: "ホスティング・デプロイ基盤",
    planTier: "Hobby",
    requiredEnvVars: [],
    dashboardUrl: "https://vercel.com/dashboard",
  },
  {
    name: "Google Cloud（OAuth）",
    purpose: "BGJ職員ログイン（@biogaia.jpドメイン制限）",
    planTier: "無料枠",
    requiredEnvVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    dashboardUrl: "https://console.cloud.google.com/apis/credentials",
  },
  {
    name: "NextAuth（アプリ自身の認証基盤）",
    purpose: "3ポータル共通のセッション管理",
    planTier: "—",
    requiredEnvVars: ["AUTH_SECRET", "AUTH_URL"],
    dashboardUrl: "",
  },
  {
    name: "GitHub",
    purpose: "ソースコード管理・CI（GitHub Actions）",
    planTier: "Free",
    requiredEnvVars: [],
    dashboardUrl: "https://github.com/masashi-sketch/dental-portal",
  },
  {
    name: "Sentry",
    purpose: "エラー監視（DSN未設定の間は自動的に無効化される）",
    planTier: "Developer（無料）",
    requiredEnvVars: ["NEXT_PUBLIC_SENTRY_DSN"],
    dashboardUrl: "https://sentry.io",
  },
];

type EnvVarStatus = { name: string; configured: boolean };

export default function BgjSystemAppsPage() {
  const [envVars, setEnvVars] = useState<EnvVarStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bgj/system/env-check")
      .then((res) => {
        if (!res.ok) throw new Error("環境変数の確認に失敗しました");
        return res.json();
      })
      .then((data) => {
        setEnvVars(data.envVars ?? []);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">アプリ管理</h1>
        <p className="text-sm text-slate-500 mt-0.5">このアプリが依存している外部サービスと、必要な環境変数の一覧です</p>
      </div>

      <div className="flex flex-col gap-4">
        {MANAGED_APPS.map((app) => (
          <Card key={app.name} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-bold text-slate-800">{app.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{app.purpose}</p>
              </div>
              <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full shrink-0">
                {app.planTier}
              </span>
            </div>
            {app.requiredEnvVars.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {app.requiredEnvVars.map((v) => (
                  <code key={v} className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-mono text-xs text-slate-600">
                    {v}
                  </code>
                ))}
              </div>
            )}
            {app.dashboardUrl && (
              <a
                href={app.dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs text-violet-600 hover:underline mt-3"
              >
                ダッシュボードを開く →
              </a>
            )}
          </Card>
        ))}

        {/* 環境変数の設定状況 */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-700">環境変数の設定状況</p>
            <p className="text-xs text-slate-400 mt-0.5">値そのものは表示しません（設定有無のみ）</p>
          </div>

          {error && (
            <div className="m-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          {loading ? (
            <LoadingState />
          ) : (
            <div className="divide-y divide-slate-50">
              {envVars.map((v) => (
                <div key={v.name} className="flex items-center justify-between px-5 py-3">
                  <code className="font-mono text-xs text-slate-700">{v.name}</code>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      v.configured ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {v.configured ? "設定済み" : "未設定"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
