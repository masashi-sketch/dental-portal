'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import * as Sentry from '@sentry/nextjs';

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

function resolvePortal(pathname: string): 'patient' | 'clinic' | 'bgj' {
  if (pathname.startsWith('/admin')) return 'clinic';
  if (pathname.startsWith('/bgj')) return 'bgj';
  return 'patient';
}

const SENTRY_LEVEL: Record<string, 'info' | 'warning'> = {
  'needs-improvement': 'info',
  poor: 'warning',
};

// CLAUDE.mdの「レスポンス計測方針」1番（ブラウザ実測）。属性はルート名・ポータル種別のみに
// 限定し、個人情報・機密情報は送らない。Sentry無料枠の消費を抑えるため、良好（good）な
// 計測は送信せず、目標を外れた計測のみ送る。
export default function WebVitalsReporter() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // reportWebVitalsFnの参照が変わるとNext.js側で再購読されるため、useCallbackで
  // 安定させる（依存配列を空にし、最新のpathnameはrefから読む）。
  const reportMetric = useCallback<ReportWebVitalsCallback>((metric) => {
    if (metric.rating === 'good') return;
    Sentry.captureMessage(`web-vital.${metric.name}`, {
      level: SENTRY_LEVEL[metric.rating] ?? 'info',
      tags: {
        route: pathnameRef.current,
        portal: resolvePortal(pathnameRef.current),
        metricName: metric.name,
        rating: metric.rating,
      },
      extra: { value: metric.value },
    });
  }, []);

  useReportWebVitals(reportMetric);
  return null;
}
