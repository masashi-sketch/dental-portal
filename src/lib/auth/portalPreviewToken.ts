import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Session } from 'next-auth';

export const PORTAL_PREVIEW_HEADER = 'x-portal-preview-token';
export const PORTAL_PREVIEW_QUERY = 'portalPreview';
export const PORTAL_PREVIEW_TTL_SECONDS = 15 * 60;

export type PortalPreviewKind = 'clinic' | 'patient';

export type PortalPreviewPayload = {
  v: 1;
  kind: PortalPreviewKind;
  targetId: string;
  actor: string;
  exp: number;
};

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET is required to sign portal preview tokens');
  return value;
}

export function getPortalPreviewActor(session: Session): string | null {
  if (session.user.role === 'bgj' && session.user.email) return `bgj:${session.user.email.toLowerCase()}`;
  if (session.user.role === 'clinic' && session.user.clinicUserId) return `clinic:${session.user.clinicUserId}`;
  return null;
}

function signature(encodedPayload: string): Buffer {
  return createHmac('sha256', secret()).update(encodedPayload).digest();
}

export function signPortalPreviewToken(
  session: Session,
  kind: PortalPreviewKind,
  targetId: string,
  now = Date.now(),
): string {
  const actor = getPortalPreviewActor(session);
  if (!actor) throw new Error('This session cannot create a portal preview');
  const payload: PortalPreviewPayload = {
    v: 1,
    kind,
    targetId,
    actor,
    exp: Math.floor(now / 1000) + PORTAL_PREVIEW_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${signature(encodedPayload).toString('base64url')}`;
}

export function verifyPortalPreviewToken(
  token: string | null | undefined,
  session: Session | null,
  now = Date.now(),
): PortalPreviewPayload | null {
  if (!token || !session) return null;
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) return null;

  let suppliedSignature: Buffer;
  let payload: PortalPreviewPayload;
  try {
    suppliedSignature = Buffer.from(encodedSignature, 'base64url');
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as PortalPreviewPayload;
  } catch {
    return null;
  }

  const expectedSignature = signature(encodedPayload);
  if (suppliedSignature.length !== expectedSignature.length
    || !timingSafeEqual(suppliedSignature, expectedSignature)) return null;
  if (payload.v !== 1 || !['clinic', 'patient'].includes(payload.kind) || !payload.targetId) return null;
  if (payload.exp <= Math.floor(now / 1000)) return null;
  return payload.actor === getPortalPreviewActor(session) ? payload : null;
}
