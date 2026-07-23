import 'server-only';
import { headers } from 'next/headers';
import { getToken, type JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import type { ClinicPortalPermissionKey, ClinicPortalRoleKey } from '@/lib/supabase/types';

// SessionProviderの初期値専用。暗号化・署名済みのAuth.js JWTを復号するだけで、
// DB再照会はしない。Proxyと各Route Handlerのauth()が引き続きアカウント状態と
// 権限を検証するため、この値をサーバー認可には使用しない。
export async function readHydratedSession(): Promise<Session | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie') ?? '';
  const secureCookie = cookieHeader.includes('__Secure-authjs.session-token=');
  const token = await getToken({ req: { headers: requestHeaders }, secret, secureCookie }) as JWT | null;
  if (!token?.role || !['bgj', 'clinic', 'patient'].includes(token.role)) return null;

  return {
    user: {
      name: token.name ?? null,
      email: token.email ?? null,
      image: token.picture ?? null,
      role: token.role,
      customerCode: (token.customerCode as string | null | undefined) ?? null,
      patientId: (token.patientId as string | null | undefined) ?? null,
      clinicRole: (token.clinicRole as ClinicPortalRoleKey | null | undefined) ?? null,
      clinicPermissions: (token.clinicPermissions as ClinicPortalPermissionKey[] | undefined) ?? [],
      clinicSessionVersion: (token.clinicSessionVersion as number | null | undefined) ?? null,
      clinicUserId: (token.clinicUserId as string | null | undefined) ?? null,
      clinicMustChangePassword: Boolean(token.clinicMustChangePassword),
      accountDisabled: Boolean(token.accountDisabled),
    },
    expires: token.exp
      ? new Date(token.exp * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
