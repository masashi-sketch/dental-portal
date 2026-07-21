'use client';

import type { Clinic, ClinicIntroInfo, ClinicPatientSettings, SalesRepWithMaster } from '@/lib/supabase/types';

export type ClinicInfo = Clinic & ClinicPatientSettings & ClinicIntroInfo & { staff: SalesRepWithMaster | null };

type CacheEntry = {
  expiresAt: number;
  request: Promise<ClinicInfo | null>;
};

const CACHE_TTL_MS = 5_000;
const requestCache = new Map<string, CacheEntry>();

// サイドバーと各画面が同時に同じ医院情報を要求するため、短時間だけPromiseを共有する。
// 長期キャッシュにはせず、設定更新後の表示が古いまま残らないよう5秒で失効させる。
export function requestClinicInfo(customerCode: string): Promise<ClinicInfo | null> {
  const now = Date.now();
  const cached = requestCache.get(customerCode);
  if (cached && cached.expiresAt > now) return cached.request;

  const request = fetch(`/api/admin/clinic-info?customerCode=${encodeURIComponent(customerCode)}`)
    .then(async (response) => {
      if (!response.ok) return null;
      const body = await response.json();
      return (body.clinic ?? null) as ClinicInfo | null;
    })
    .catch((error) => {
      requestCache.delete(customerCode);
      throw error;
    });

  requestCache.set(customerCode, { expiresAt: now + CACHE_TTL_MS, request });
  return request;
}

export function clearClinicInfoRequestCache() {
  requestCache.clear();
}
