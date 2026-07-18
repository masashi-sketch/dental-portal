"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import type { ClinicInquiry, ClinicInquiryReply } from "@/lib/supabase/types";

type InquiryWithClinicName = ClinicInquiry & { clinicName: string };

const STATUS_CLASSES: Record<string, string> = {
  未対応: "bg-red-100 text-red-700",
  対応中: "bg-amber-100 text-amber-700",
  完了: "bg-emerald-100 text-emerald-700",
};

// Slack通知内のリンクから遷移してくる問い合わせ詳細・返信専用ページ。
// 得意先詳細画面の「行動履歴」タブとは別に、単独URLとして完結するよう設計している。
export default function BgjInquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast, showToast } = useToast();

  const [inquiry, setInquiry] = useState<InquiryWithClinicName | null>(null);
  const [replies, setReplies] = useState<ClinicInquiryReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/bgj/inquiries/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("問い合わせが見つかりません");
        return res.json();
      })
      .then((data) => {
        setInquiry(data.inquiry);
        setReplies(data.replies ?? []);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "エラーが発生しました"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bgj/inquiries/${id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "返信の送信に失敗しました");
      }
      const { reply } = await res.json();
      setReplies((prev) => [...prev, reply]);
      setInquiry((prev) => (prev && prev.status === "未対応" ? { ...prev, status: "対応中" } : prev));
      setReplyBody("");
      showToast("返信を送信しました");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}

      {loading && <p className="text-slate-400">読み込み中...</p>}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {!loading && inquiry && (
        <>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
            <Link href={`/bgj/customers/${inquiry.customer_code}`} className="hover:text-violet-600">
              {inquiry.clinicName}
            </Link>
            <span>/</span>
            <span className="text-slate-600">問い合わせ</span>
          </div>

          <Card className="p-5 mb-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-lg font-bold text-slate-800">{inquiry.subject}</h1>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${STATUS_CLASSES[inquiry.status]}`}>
                {inquiry.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              {inquiry.created_by ?? "送信者不明"} ・ {new Date(inquiry.created_at).toLocaleString("ja-JP")}
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{inquiry.body}</p>
          </Card>

          <div className="flex flex-col gap-3 mb-4">
            {replies.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-semibold text-slate-700">{r.author_name ?? "BGJ職員"}</p>
                  <span className="text-xs text-slate-400 shrink-0">{new Date(r.created_at).toLocaleString("ja-JP")}</span>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{r.body}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">返信する</h2>
            <textarea
              rows={4}
              placeholder="返信内容を入力してください"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none mb-3"
            />
            <Button theme="violet" size="sm" onClick={handleReply} disabled={sending}>
              {sending ? "送信中..." : "返信を送信"}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
