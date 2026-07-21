"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import type { BgjPatientListItem, BgjPatientsResponse } from "@/app/api/bgj/patients/route";

const STATUS_BADGE_CLASS: Record<string, string> = {
  有効: "bg-emerald-50 text-emerald-600",
  無効: "bg-slate-100 text-slate-500",
};

function isLocked(p: BgjPatientListItem): boolean {
  return !!p.locked_until && new Date(p.locked_until).getTime() > Date.now();
}

export default function BgjPatientsPage() {
  const [patients, setPatients] = useState<BgjPatientListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback((searchQuery: string, targetPage: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(targetPage) });
    if (searchQuery) params.set("q", searchQuery);
    fetch(`/api/bgj/patients?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("患者一覧の取得に失敗しました");
        return res.json() as Promise<BgjPatientsResponse>;
      })
      .then((data) => {
        setPatients(data.patients);
        setTotal(data.total);
        setPageSize(data.pageSize);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "エラーが発生しました"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(q, page);
    }, 300);
    return () => clearTimeout(timer);
  }, [q, page, fetchPatients]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">患者一覧</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total}件登録</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      <Card className="p-4 mb-4">
        <input
          type="text"
          placeholder="氏名・ログインID・患者番号で検索"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["得意先", "患者番号", "氏名", "ログインID", "メール", "ステータス", "登録日", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <LoadingState variant="table-row" colSpan={8} />}
              {!loading && patients.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    該当する患者様が見つかりません
                  </td>
                </tr>
              )}
              {!loading &&
                patients.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-violet-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-slate-700 font-medium">{p.clinic_name ?? "—"}</p>
                      <p className="text-slate-400 text-xs font-mono">{p.customer_code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">{p.patient_no}</td>
                    <td className="px-4 py-3 text-slate-800 font-semibold whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-xs whitespace-nowrap">
                      {p.login_id}
                      {isLocked(p) && (
                        <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                          ロック中
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{p.email ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE_CLASS[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{p.registered_at}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/bgj/patients/${p.id}`} className="text-xs font-semibold text-violet-600 hover:underline">
                        詳細へ
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>
              {page} / {totalPages} ページ
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                前へ
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
