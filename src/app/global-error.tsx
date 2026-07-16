'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', fontFamily: 'sans-serif' }}>
          <p style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>予期しないエラーが発生しました</p>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>お手数ですが、時間をおいて再度お試しください。</p>
        </div>
      </body>
    </html>
  );
}
