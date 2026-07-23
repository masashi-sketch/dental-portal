'use client';

import { useEffect, useState } from 'react';

export const DEFAULT_LOGIN_CLINIC_NAME = 'デンタルポータル';
export const DEFAULT_LOGIN_BACKGROUND = '/patient-login-bg.jpg';
export const LAST_CLINIC_COOKIE = 'patient-last-clinic';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function rememberLoginClinic(customerCode: string) {
  document.cookie = `${LAST_CLINIC_COOKIE}=${encodeURIComponent(customerCode)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function useLoginClinicBranding() {
  const [clinicName, setClinicName] = useState(DEFAULT_LOGIN_CLINIC_NAME);
  const [backgroundUrl, setBackgroundUrl] = useState(DEFAULT_LOGIN_BACKGROUND);

  useEffect(() => {
    const customerCode = readCookie(LAST_CLINIC_COOKIE);
    if (!customerCode) return;
    fetch(`/api/clinics/${encodeURIComponent(customerCode)}/branding`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.displayName) setClinicName(data.displayName);
        if (data?.backgroundUrl) setBackgroundUrl(data.backgroundUrl);
      })
      .catch(() => {});
  }, []);

  return { clinicName, backgroundUrl };
}
