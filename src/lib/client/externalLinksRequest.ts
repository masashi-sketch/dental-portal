'use client';

import type { ExternalLink } from '@/lib/supabase/types';

let cache: { expiresAt: number; request: Promise<ExternalLink[]> } | null = null;
const CACHE_TTL_MS = 60_000;

// 各ページにサイドバーがあるため、画面遷移のたびにLINKマスタを再取得しない。
export function requestExternalLinks(): Promise<ExternalLink[]> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.request;

  const request = fetch('/api/bgj/external-links')
    .then(async (response) => {
      if (!response.ok) return [];
      const body = await response.json();
      return (body.externalLinks ?? []) as ExternalLink[];
    })
    .catch(() => {
      cache = null;
      return [];
    });
  cache = { expiresAt: now + CACHE_TTL_MS, request };
  return request;
}

export function clearExternalLinksRequestCache() {
  cache = null;
}
