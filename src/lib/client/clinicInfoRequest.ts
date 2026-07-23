'use client';

import type { Clinic, ClinicIntroInfo, ClinicPatientSettings, SalesRepWithMaster } from '@/lib/supabase/types';

export type ClinicInfo = Clinic & ClinicPatientSettings & ClinicIntroInfo & { staff: SalesRepWithMaster | null };

type CacheEntry = {
  expiresAt: number;
  request: Promise<ClinicInfo | null>;
};

const CACHE_TTL_MS = 60_000;
const requestCache = new Map<string, CacheEntry>();

// サイドバーと各画面が同じ医院情報を要求するためPromiseと結果を共有する。
// 画面遷移のたびの再取得を避け、更新時はupdateClinicInfoRequestCacheで即時反映する。
export function requestClinicInfo(customerCode: string): Promise<ClinicInfo | null> {
  const now = Date.now();
  const cached = requestCache.get(customerCode);
  if (cached && cached.expiresAt > now) return cached.request;

  const request = fetch(`/api/admin/clinic-info?customerCode=${encodeURIComponent(customerCode)}`)
    .then(async (response) => {
      if (!response.ok) {
        requestCache.delete(customerCode);
        return null;
      }
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

export function updateClinicInfoRequestCache(customerCode: string, clinic: ClinicInfo | null) {
  requestCache.set(customerCode, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    request: Promise.resolve(clinic),
  });
}

export function clearClinicInfoRequestCache() {
  requestCache.clear();
}
