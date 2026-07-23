'use client';

import { PORTAL_COOKIE } from '@/lib/portalCookies';

export { PORTAL_COOKIE } from '@/lib/portalCookies';

export type PortalCookieState = {
  clinicPreviewCustomerCode: string | null;
  patientPreviewId: string | null;
};

const STATE_CHANGED_EVENT = 'portal-state-changed';
const EMPTY_STATE_KEY = '|';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

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

export function readPortalCookieState(): PortalCookieState {
  return {
    clinicPreviewCustomerCode: readCookie(PORTAL_COOKIE.clinicPreviewCustomerCode),
    patientPreviewId: readCookie(PORTAL_COOKIE.patientPreviewId),
  };
}

export function getPortalCookieStateKey(): string {
  if (typeof document === 'undefined') return EMPTY_STATE_KEY;
  const state = readPortalCookieState();
  return `${state.clinicPreviewCustomerCode ?? ''}|${state.patientPreviewId ?? ''}`;
}

export function subscribePortalCookieState(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handleFocus = () => onStoreChange();
  window.addEventListener(STATE_CHANGED_EVENT, onStoreChange);
  window.addEventListener('focus', handleFocus);
  return () => {
    window.removeEventListener(STATE_CHANGED_EVENT, onStoreChange);
    window.removeEventListener('focus', handleFocus);
  };
}

export function markPortalSelected() {
  setCookie(PORTAL_COOKIE.selected, 'true');
}

export function clearPortalSelection() {
  deletePortalCookie(PORTAL_COOKIE.selected);
}

export function beginClinicPreview(customerCode: string) {
  deletePortalCookie(PORTAL_COOKIE.patientPreviewId);
  setCookie(PORTAL_COOKIE.clinicPreviewCustomerCode, customerCode, 86_400);
  notifyStateChanged();
}

export function endClinicPreview() {
  deletePortalCookie(PORTAL_COOKIE.clinicPreviewCustomerCode);
  notifyStateChanged();
}

export function beginPatientPreview(patientId: string) {
  deletePortalCookie(PORTAL_COOKIE.clinicPreviewCustomerCode);
  setCookie(PORTAL_COOKIE.patientPreviewId, patientId, 86_400);
  notifyStateChanged();
}

export function endPatientPreview() {
  deletePortalCookie(PORTAL_COOKIE.patientPreviewId);
  notifyStateChanged();
}

export function resetTransientPortalState() {
  deletePortalCookie(PORTAL_COOKIE.clinicPreviewCustomerCode);
  deletePortalCookie(PORTAL_COOKIE.patientPreviewId);
  notifyStateChanged();
}

export function preparePortalLogout() {
  clearPortalSelection();
  resetTransientPortalState();
}
