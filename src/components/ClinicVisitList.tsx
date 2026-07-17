'use client';

import Card from '@/components/ui/Card';
import type { ClinicVisit } from '@/lib/supabase/types';

// BGJポータル（/bgj/customers/[code]、訪問記録タブ）専用の表示専用コンポーネント。
// 「訪問記録を追加」ボタンとモーダルはページヘッダー側で全タブ共通に扱っているため
// 親ページに残し、このコンポーネントは一覧表示のみを担う。
export default function ClinicVisitList({ visits }: { visits: ClinicVisit[] }) {
  return (
    <div className="flex flex-col gap-3">
      {visits.length === 0 && (
        <Card className="p-5 text-center text-slate-400 text-sm">
          訪問記録はまだありません
        </Card>
      )}
      {visits.map((v) => (
        <Card key={v.id} className="p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="text-xs text-slate-400">{v.visit_date}</span>
              <p className="text-sm font-bold text-slate-700 mt-0.5">{v.purpose}</p>
            </div>
            {v.next_visit_date && (
              <span className="text-xs text-slate-400 shrink-0">次回予定：{v.next_visit_date}</span>
            )}
          </div>
          {v.memo && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{v.memo}</p>}
        </Card>
      ))}
    </div>
  );
}
