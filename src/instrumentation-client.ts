import * as Sentry from '@sentry/nextjs';
import { scrubPii } from '@/lib/sentryScrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // ローカル開発サーバー（npm run dev）のノイズが本番監視用のSentryに混ざらないようにする。
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubPii,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
