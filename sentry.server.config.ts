import * as Sentry from '@sentry/nextjs';
import { scrubPii } from '@/lib/sentryScrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // ローカル開発サーバー（npm run dev）のノイズ（webpackキャッシュのENOENT等、
  // 本番運用と無関係な一過性エラー）が本番監視用のSentryに混ざらないようにする。
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubPii,
});
