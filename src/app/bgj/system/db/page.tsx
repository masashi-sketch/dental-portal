"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import type { DbTableUsage } from "@/lib/supabase/types";

// Supabase Free tierのDB容量上限（MB）。料金体系は変更されうるため、
// 実際の移行判断の前には supabase.com/pricing で最新値を確認すること。
const FREE_TIER_LIMIT_MB = 500;
const WARN_THRESHOLD = 70;
const DANGER_THRESHOLD = 90;

function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

export default function BgjSystemDbPage() {
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const [tables, setTables] = useState<DbTableUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bgj/system/db-usage")
      .then((res) => {
        if (!res.ok) throw new Error("DB使用量の取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setTotalBytes(data.totalBytes);
        setTables(data.tables ?? []);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      })
      .finally(() => setLoading(false));
  }, []);

  const usedMb = totalBytes !== null ? bytesToMb(totalBytes) : null;
  const usageRate = usedMb !== null ? Math.min(Math.round((usedMb / FREE_TIER_LIMIT_MB) * 100), 999) : null;

  const barColor =
    usageRate === null ? "bg-slate-300" : usageRate >= DANGER_THRESHOLD ? "bg-red-500" : usageRate >= WARN_THRESHOLD ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">DB管理</h1>
        <p className="text-sm text-slate-500 mt-0.5">Supabaseデータベースの使用量と有償プラン移行の目安を確認できます</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <p className="text-sm font-bold text-slate-700 mb-4">DB使用量（概況）</p>
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">
                {usedMb !== null ? `${usedMb.toFixed(1)} MB` : "—"}
                <span className="text-slate-400"> / {FREE_TIER_LIMIT_MB} MB（Free tier上限の目安）</span>
              </p>
              <p className="font-bold text-base text-slate-700">{usageRate !== null ? `${usageRate}%` : "—"}</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(usageRate ?? 0, 100)}%` }}
              />
            </div>
            {usageRate !== null && usageRate >= DANGER_THRESHOLD && (
              <p className="text-red-600 text-sm font-semibold mt-3 bg-red-50 rounded-xl py-2 text-center">
                Free tier上限の{DANGER_THRESHOLD}%に達しています。有償プラン（Supabase Pro等）への移行を検討してください。
              </p>
            )}
            {usageRate !== null && usageRate >= WARN_THRESHOLD && usageRate < DANGER_THRESHOLD && (
              <p className="text-amber-600 text-sm font-semibold mt-3 bg-amber-50 rounded-xl py-2 text-center">
                Free tier上限の{WARN_THRESHOLD}%を超えています。今後の増加ペースを踏まえて有償プランへの移行を検討し始める時期です。
              </p>
            )}
            <p className="text-xs text-slate-400 mt-3">
              帯域（egress）・ファイルストレージの使用量はPostgres内から取得できないため、
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-violet-600 underline">Supabaseダッシュボード</a>
              でご確認ください。上限値は変更されることがあるため、移行判断の前に
              <a href="https://supabase.com/pricing" target="_blank" rel="noreferrer" className="text-violet-600 underline">supabase.com/pricing</a>
              の最新情報もあわせてご確認ください。
            </p>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-700">テーブル別サイズ内訳</p>
              <p className="text-xs text-slate-400 mt-0.5">件数は統計情報に基づく概算値です</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">テーブル名</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">サイズ</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">概算件数</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.length === 0 && (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">データがありません</td></tr>
                  )}
                  {tables.map((t) => (
                    <tr key={t.table_name} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-slate-700">{t.table_name}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{bytesToMb(t.size_bytes).toFixed(2)} MB</td>
                      <td className="px-5 py-3 text-right text-slate-400">{t.row_estimate.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
