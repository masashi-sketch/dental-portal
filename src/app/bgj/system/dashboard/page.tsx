"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import { CLINIC_STATUS_BADGE_CLASS } from "@/lib/clinicStatusColors";
import type { SystemDashboardResponse } from "@/app/api/bgj/system/dashboard/route";
import type { SentryIssuesResponse } from "@/app/api/bgj/system/sentry-issues/route";

// src/app/bgj/system/db/page.tsxのFREE_TIER_LIMIT_MBと同じ値（Supabase Free tierの目安）。
// 変更する場合は両方を合わせて更新すること。
const FREE_TIER_LIMIT_MB = 500;

function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

export default function BgjSystemDashboardPage() {
  const [dashboard, setDashboard] = useState<SystemDashboardResponse | null>(null);
  const [sentry, setSentry] = useState<SentryIssuesResponse | null>(null);
  const [dbTotalBytes, setDbTotalBytes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/bgj/system/dashboard").then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<SystemDashboardResponse>;
      }),
      fetch("/api/bgj/system/sentry-issues").then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<SentryIssuesResponse>;
      }),
      fetch("/api/bgj/system/db-usage").then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<{ totalBytes: number }>;
      }),
    ]).then(([dashboardResult, sentryResult, dbUsageResult]) => {
      if (dashboardResult.status === "fulfilled") {
        setDashboard(dashboardResult.value);
      } else {
        setError("システムダッシュボードの取得に失敗しました");
      }
      if (sentryResult.status === "fulfilled") {
        setSentry(sentryResult.value);
      }
      if (dbUsageResult.status === "fulfilled") {
        setDbTotalBytes(dbUsageResult.value.totalBytes);
      }
      setLoading(false);
    });
  }, []);

  const kpis = dashboard
    ? [
        {
          label: "得意先数",
          value: dashboard.clinics.total,
          color: "text-violet-600",
          bg: "bg-violet-50 border-violet-200",
        },
        {
          label: "医院アカウント数",
          value: dashboard.clinicUsers.total,
          sub: `うち有効 ${dashboard.clinicUsers.active}件`,
          color: "text-teal-600",
          bg: "bg-teal-50 border-teal-200",
        },
        {
          label: "患者アカウント数",
          value: dashboard.patients.total,
          sub: `うちQR自己登録 ${dashboard.patients.qrRegistered}件`,
          color: "text-sky-600",
          bg: "bg-sky-50 border-sky-200",
        },
        {
          label: "未対応の問い合わせ",
          value: dashboard.inquiries.open,
          color: dashboard.inquiries.open > 0 ? "text-amber-600" : "text-slate-600",
          bg: dashboard.inquiries.open > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200",
        },
      ]
    : [];

  const usedMb = dbTotalBytes !== null ? bytesToMb(dbTotalBytes) : null;
  const usageRate = usedMb !== null ? Math.min(Math.round((usedMb / FREE_TIER_LIMIT_MB) * 100), 999) : null;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">システムダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-0.5">アカウント数・エラー・DB容量など、システム運用状況の概況</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {loading ? (
        <LoadingState />
      ) : dashboard ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((kpi) => (
              <div key={kpi.label} className={`rounded-2xl border p-4 ${kpi.bg}`}>
                <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}件</p>
                {kpi.sub && <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>}
              </div>
            ))}
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">セキュリティ状況</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">ロック中の医院アカウント</p>
                <p className="text-xl font-bold text-slate-800">{dashboard.clinicUsers.locked}件</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">ロック中の患者アカウント</p>
                <p className="text-xl font-bold text-slate-800">{dashboard.patients.locked}件</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Sentry未解決issue数</p>
                {sentry?.configured && "unresolvedCount" in sentry ? (
                  <p className="text-xl font-bold text-slate-800">
                    {sentry.unresolvedCount}件
                    {sentry.unresolvedCount > 0 && (
                      <Link href="/bgj/system/apps" className="ml-2 text-xs font-normal text-violet-600 hover:underline">
                        詳細へ
                      </Link>
                    )}
                  </p>
                ) : sentry?.configured ? (
                  <p className="text-sm text-red-500">取得エラー</p>
                ) : (
                  <p className="text-sm text-slate-400">未設定</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">得意先ステータス内訳</h2>
            <div className="flex flex-wrap gap-2">
              {dashboard.clinics.byStatus.length === 0 && dashboard.clinics.unset === 0 && (
                <p className="text-sm text-slate-400">データがありません</p>
              )}
              {dashboard.clinics.byStatus.map((s) => (
                <span
                  key={s.id}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CLINIC_STATUS_BADGE_CLASS[s.color]}`}
                >
                  {s.name} {s.count}件
                </span>
              ))}
              {dashboard.clinics.unset > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                  未設定 {dashboard.clinics.unset}件
                </span>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">DB容量</h2>
            {usageRate !== null && usedMb !== null ? (
              <>
                <p className="text-xl font-bold text-slate-800">{usageRate}%</p>
                <p className="text-xs text-slate-400 mt-1">
                  {usedMb.toFixed(1)} MB / {FREE_TIER_LIMIT_MB} MB（Free tier上限の目安）
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400">取得できませんでした</p>
            )}
            <Link href="/bgj/system/db" className="inline-block mt-3 text-xs font-semibold text-violet-600 hover:underline">
              詳しくはDB管理へ →
            </Link>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
