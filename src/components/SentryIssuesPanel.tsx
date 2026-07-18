'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import type { SentryIssuesResponse } from '@/app/api/bgj/system/sentry-issues/route';

const LEVEL_CLASSES: Record<string, string> = {
  fatal: 'bg-red-100 text-red-700',
  error: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-sky-100 text-sky-700',
};

// BGJポータル（/bgj/system/apps、アプリ管理画面）専用。Sentryの未解決issueを
// 直近14日分・頻度順に取得して表示する（詳細確認はSentry本体へのリンクで行う）。
export default function SentryIssuesPanel() {
  const [data, setData] = useState<SentryIssuesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bgj/system/sentry-issues')
      .then((res) => (res.ok ? res.json() : { configured: true, error: '取得に失敗しました' }))
      .then((body: SentryIssuesResponse) => setData(body))
      .catch(() => setData({ configured: true, error: '取得に失敗しました' }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-700">エラー監視状況（Sentry）</p>
          <p className="text-xs text-slate-400 mt-0.5">直近14日間・未解決のエラーを頻度順に表示</p>
        </div>
        <a
          href="https://biogaiajp.sentry.io"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-violet-600 hover:underline shrink-0"
        >
          Sentryを開く →
        </a>
      </div>

      {loading ? (
        <LoadingState />
      ) : !data || !data.configured ? (
        <p className="text-slate-400 text-sm px-5 py-6">
          SENTRY_AUTH_TOKENが未設定のため表示できません。
        </p>
      ) : 'error' in data ? (
        <p className="text-red-600 text-sm px-5 py-6">{data.error}</p>
      ) : data.issues.length === 0 ? (
        <p className="text-slate-400 text-sm px-5 py-6">未解決のエラーはありません。</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {data.issues.map((issue) => (
            <a
              key={issue.id}
              href={issue.permalink}
              target="_blank"
              rel="noreferrer"
              className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      LEVEL_CLASSES[issue.level] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {issue.level}
                  </span>
                  <p className="text-sm font-semibold text-slate-800 truncate">{issue.title}</p>
                </div>
                {issue.culprit && <p className="text-xs text-slate-400 mt-0.5 truncate">{issue.culprit}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-slate-600">{issue.count}件</p>
                <p className="text-[11px] text-slate-400">{new Date(issue.lastSeen).toLocaleDateString('ja-JP')}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
