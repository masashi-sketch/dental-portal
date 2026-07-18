import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

// Sentryの組織スラッグ・プロジェクトID（DSNに含まれる数値ID）。秘密情報ではないため
// 定数として埋め込む。プロジェクトを作り直した場合はここを更新すること。
const SENTRY_ORG_SLUG = 'biogaiajp';
const SENTRY_PROJECT_ID = '4511754532552704';

type SentryApiIssue = {
  id: string;
  shortId: string;
  title: string;
  culprit: string | null;
  level: string;
  count: string;
  lastSeen: string;
  permalink: string;
};

export type SentryIssuesResponse =
  | { configured: false }
  | { configured: true; error: string }
  | { configured: true; unresolvedCount: number; issues: SentryApiIssue[] };

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) {
    return NextResponse.json<SentryIssuesResponse>({ configured: false });
  }

  const url = `https://sentry.io/api/0/organizations/${SENTRY_ORG_SLUG}/issues/?project=${SENTRY_PROJECT_ID}&query=is:unresolved&statsPeriod=14d&sort=freq&limit=10`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    return NextResponse.json<SentryIssuesResponse>({ configured: true, error: 'Sentry APIへの接続に失敗しました' });
  }

  if (!res.ok) {
    return NextResponse.json<SentryIssuesResponse>({
      configured: true,
      error: res.status === 401 ? 'Sentryのトークンが無効です' : `Sentry APIエラー（${res.status}）`,
    });
  }

  const issues = (await res.json()) as SentryApiIssue[];
  return NextResponse.json<SentryIssuesResponse>({
    configured: true,
    unresolvedCount: issues.length,
    issues,
  });
}
