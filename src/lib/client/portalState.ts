'use client';

import { PORTAL_COOKIE } from '@/lib/portalCookies';

export { PORTAL_COOKIE } from '@/lib/portalCookies';

export type PortalCookieState = {
  clinicPreviewCustomerCode: string | null;
  patientPreviewId: string | null;
};

type PreviewPayload = {
  v: 1;
  kind: 'clinic' | 'patient';
  targetId: string;
  exp: number;
};

const STATE_CHANGED_EVENT = 'portal-state-changed';
const STORAGE_KEY = 'portal-preview-token';
const PREVIEW_QUERY = 'portalPreview';
const PREVIEW_HEADER = 'x-portal-preview-token';
const EMPTY_STATE_KEY = '|';
const FETCH_PATCH_FLAG = '__portalPreviewFetchInstalled';
const PREVIEW_API_PREFIXES = ['/api/admin', '/api/patient-portal', '/api/periodontal'];

function notifyStateChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(STATE_CHANGED_EVENT));
}

function setCookie(name: string, value: string, maxAge?: number) {
  if (typeof document === 'undefined') return;
  const maxAgePart = maxAge === undefined ? '' : `; max-age=${maxAge}`;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${maxAgePart}`;
}

export function deletePortalCookie(name: (typeof PORTAL_COOKIE)[keyof typeof PORTAL_COOKIE]) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function decodePreviewToken(token: string | null): PreviewPayload | null {
  if (!token) return null;
  try {
    const encodedPayload = token.split('.')[0];
    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'))) as PreviewPayload;
    if (payload.v !== 1 || !['clinic', 'patient'].includes(payload.kind) || !payload.targetId) return null;
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

function getPreviewToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = window.sessionStorage.getItem(STORAGE_KEY);
  if (!decodePreviewToken(token)) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
  return token;
}

export function bootstrapPortalPreviewFromLocation() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const token = url.searchParams.get(PREVIEW_QUERY);
  if (decodePreviewToken(token)) window.sessionStorage.setItem(STORAGE_KEY, token!);
  if (token !== null) {
    url.searchParams.delete(PREVIEW_QUERY);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
  // 旧実装の共有Cookieはタブ間干渉を起こすため、移行後は常に破棄する。
  deletePortalCookie(PORTAL_COOKIE.clinicPreviewCustomerCode);
  deletePortalCookie(PORTAL_COOKIE.patientPreviewId);
}

export function installPortalPreviewFetch() {
  if (typeof window === 'undefined') return;
  const patchedWindow = window as typeof window & { [FETCH_PATCH_FLAG]?: boolean };
  if (patchedWindow[FETCH_PATCH_FLAG]) return;
  patchedWindow[FETCH_PATCH_FLAG] = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const token = getPreviewToken();
    if (!token) return originalFetch(input, init);
    const rawUrl = input instanceof Request ? input.url : input.toString();
    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin || !PREVIEW_API_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
      return originalFetch(input, init);
    }
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    headers.set(PREVIEW_HEADER, token);
    return originalFetch(input, { ...init, headers });
  };
}

export function readPortalCookieState(): PortalCookieState {
  const payload = decodePreviewToken(getPreviewToken());
  return {
    clinicPreviewCustomerCode: payload?.kind === 'clinic' ? payload.targetId : null,
    patientPreviewId: payload?.kind === 'patient' ? payload.targetId : null,
  };
}

export function getPortalCookieStateKey(): string {
  if (typeof window === 'undefined') return EMPTY_STATE_KEY;
  const state = readPortalCookieState();
  return `${state.clinicPreviewCustomerCode ?? ''}|${state.patientPreviewId ?? ''}`;
}

export function subscribePortalCookieState(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(STATE_CHANGED_EVENT, onStoreChange);
  window.addEventListener('focus', onStoreChange);
  return () => {
    window.removeEventListener(STATE_CHANGED_EVENT, onStoreChange);
    window.removeEventListener('focus', onStoreChange);
  };
}

export function markPortalSelected() {
  setCookie(PORTAL_COOKIE.selected, 'true');
}

export function clearPortalSelection() {
  deletePortalCookie(PORTAL_COOKIE.selected);
}

async function openPortalPreview(kind: PreviewPayload['kind'], targetId: string, path: string) {
  const previewWindow = window.open('about:blank', '_blank');
  if (!previewWindow) throw new Error('ポップアップがブロックされました。ブラウザでポップアップを許可してください。');
  previewWindow.opener = null;
  try {
    const response = await fetch('/api/portal-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, targetId }),
    });
    const body = await response.json().catch(() => null) as { token?: string; error?: string } | null;
    if (!response.ok || !body?.token) throw new Error(body?.error ?? 'プレビューの開始に失敗しました。');
    previewWindow.location.replace(`${path}?${PREVIEW_QUERY}=${encodeURIComponent(body.token)}`);
  } catch (error) {
    previewWindow.close();
    throw error;
  }
}

export function openClinicPreview(customerCode: string) {
  return openPortalPreview('clinic', customerCode, '/admin');
}

export function openPatientPreview(patientId: string) {
  return openPortalPreview('patient', patientId, '/medication');
}

export function endClinicPreview() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(STORAGE_KEY);
  notifyStateChanged();
}

export function endPatientPreview() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(STORAGE_KEY);
  notifyStateChanged();
}

export function resetTransientPortalState() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(STORAGE_KEY);
  deletePortalCookie(PORTAL_COOKIE.clinicPreviewCustomerCode);
  deletePortalCookie(PORTAL_COOKIE.patientPreviewId);
  notifyStateChanged();
}

export function preparePortalLogout() {
  clearPortalSelection();
  resetTransientPortalState();
}
