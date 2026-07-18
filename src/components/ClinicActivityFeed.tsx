'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import type { ClinicInquiry, ClinicInquiryReply, ClinicVisit } from '@/lib/supabase/types';

type InquiryWithReplies = ClinicInquiry & { replies: ClinicInquiryReply[] };

type FeedEntry =
  | { type: 'visit'; date: string; visit: ClinicVisit }
  | { type: 'inquiry'; date: string; inquiry: InquiryWithReplies };

const STATUS_CLASSES: Record<string, string> = {
  未対応: 'bg-red-100 text-red-700',
  対応中: 'bg-amber-100 text-amber-700',
  完了: 'bg-emerald-100 text-emerald-700',
};

// BGJポータル（/bgj/customers/[code]、行動履歴タブ）専用。訪問記録（既存API）と
// 問い合わせ（新規API、返信を含む）を自己fetchし、日付降順の1つのフィードとして
// 統合表示する。「訪問記録を追加」ボタン・モーダルは既存通り親ページに残るため、
// 追加成功時はrefreshKeyをインクリメントしてもらい再fetchする。
export default function ClinicActivityFeed({
  customerCode,
  refreshKey,
}: {
  customerCode: string;
  refreshKey?: number;
}) {
  const [entries, setEntries] = useState<FeedEntry[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/bgj/clinics/${customerCode}/visits`).then((res) => (res.ok ? res.json() : { visits: [] })),
      fetch(`/api/bgj/clinics/${customerCode}/inquiries`).then((res) => (res.ok ? res.json() : { inquiries: [] })),
    ]).then(([visitsData, inquiriesData]) => {
      const visitEntries: FeedEntry[] = (visitsData.visits ?? []).map((v: ClinicVisit) => ({
        type: 'visit' as const,
        date: v.visit_date,
        visit: v,
      }));
      const inquiryEntries: FeedEntry[] = (inquiriesData.inquiries ?? []).map((i: InquiryWithReplies) => ({
        type: 'inquiry' as const,
        date: i.created_at,
        inquiry: i,
      }));
      const merged = [...visitEntries, ...inquiryEntries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setEntries(merged);
    });
  }, [customerCode, refreshKey]);

  if (entries === null) {
    return <p className="text-slate-400 text-sm">読み込み中...</p>;
  }

  if (entries.length === 0) {
    return (
      <Card className="p-5 text-center text-slate-400 text-sm">
        行動履歴はまだありません
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) =>
        entry.type === 'visit' ? (
          <Card key={`visit-${entry.visit.id}`} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">訪問</span>
                <span className="text-xs text-slate-400">{entry.visit.visit_date}</span>
              </div>
              {entry.visit.next_visit_date && (
                <span className="text-xs text-slate-400 shrink-0">次回予定：{entry.visit.next_visit_date}</span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">{entry.visit.purpose}</p>
            {entry.visit.memo && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{entry.visit.memo}</p>}
          </Card>
        ) : (
          <Card key={`inquiry-${entry.inquiry.id}`} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 shrink-0">問い合わせ</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLASSES[entry.inquiry.status]}`}>
                  {entry.inquiry.status}
                </span>
                <span className="text-xs text-slate-400">{new Date(entry.inquiry.created_at).toLocaleString('ja-JP')}</span>
              </div>
              <Link href={`/bgj/inquiries/${entry.inquiry.id}`} className="text-xs text-violet-600 hover:underline shrink-0">
                詳細・返信 →
              </Link>
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">{entry.inquiry.subject}</p>
            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2 mb-2">{entry.inquiry.body}</p>
            <p className="text-xs text-slate-400">
              {entry.inquiry.created_by ?? '送信者不明'}
              {entry.inquiry.replies.length > 0 && ` ・ 返信${entry.inquiry.replies.length}件`}
            </p>
          </Card>
        ),
      )}
    </div>
  );
}
