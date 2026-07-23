import type { WebinarProvider } from '@/lib/supabase/types';

export type WebinarDraftInput = {
  id: string | null;
  version: number;
  title: string;
  description: string;
  provider: WebinarProvider;
  startsAt: string;
  endsAt: string;
  timezone: string;
  joinUrl: string;
  externalSpaceId: string | null;
  customerCodes: string[];
  contactIds: string[];
};

export type GoogleMeetEventInput = Pick<WebinarDraftInput, 'title' | 'description' | 'startsAt' | 'endsAt' | 'timezone'>;

function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('ja-JP', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function isProviderUrl(provider: WebinarProvider, value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (provider === 'google_meet') return url.hostname === 'meet.google.com';
    return url.hostname === 'zoom.us' || url.hostname.endsWith('.zoom.us');
  } catch {
    return false;
  }
}

function parseSchedule(data: Record<string, unknown>) {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const startsAt = typeof data.startsAt === 'string' ? data.startsAt : '';
  const endsAt = typeof data.endsAt === 'string' ? data.endsAt : '';
  const timezone = typeof data.timezone === 'string' ? data.timezone.trim() : '';
  const startTime = Date.parse(startsAt);
  const endTime = Date.parse(endsAt);
  if (!title || title.length > 200) return { error: 'タイトルは200文字以内で入力してください。' };
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return { error: '終了日時は開始日時より後にしてください。' };
  if (endTime - startTime > 12 * 60 * 60 * 1000) return { error: '開催時間は12時間以内にしてください。' };
  if (!timezone || !isValidTimezone(timezone)) return { error: 'タイムゾーンが不正です。' };
  return { value: {
    title,
    description: typeof data.description === 'string' ? data.description.trim().slice(0, 5000) : '',
    startsAt: new Date(startTime).toISOString(),
    endsAt: new Date(endTime).toISOString(),
    timezone,
  } };
}

export function parseGoogleMeetEventInput(body: unknown): { value?: GoogleMeetEventInput; error?: string } {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  return parseSchedule(data);
}

export function parseWebinarDraftInput(body: unknown): { value?: WebinarDraftInput; error?: string } {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const provider = data.provider;
  const schedule = parseSchedule(data);
  if (!schedule.value) return { error: schedule.error };
  const joinUrl = typeof data.joinUrl === 'string' ? data.joinUrl.trim() : '';
  const customerCodes = Array.isArray(data.customerCodes)
    ? [...new Set(data.customerCodes.filter((code): code is string => typeof code === 'string').map((code) => code.trim()).filter(Boolean))]
    : [];
  const contactIds = Array.isArray(data.contactIds)
    ? [...new Set(data.contactIds.filter((id): id is string => typeof id === 'string').map((id) => id.trim()).filter(Boolean))]
    : [];

  if (provider !== 'google_meet' && provider !== 'zoom') return { error: '配信サービスを選択してください。' };
  if (!isProviderUrl(provider, joinUrl)) return { error: provider === 'google_meet' ? 'meet.google.com の参加URLを入力してください。' : 'zoom.us の参加URLを入力してください。' };
  if (customerCodes.length === 0 || customerCodes.length > 500) return { error: '対象医院を1件以上選択してください。' };
  if (contactIds.length === 0 || contactIds.length > 5000) return { error: 'メール送付先の担当者を1名以上選択してください。' };

  return { value: {
    id: typeof data.id === 'string' && data.id ? data.id : null,
    version: Number.isInteger(data.version) && Number(data.version) > 0 ? Number(data.version) : 1,
    ...schedule.value,
    provider,
    joinUrl,
    externalSpaceId: typeof data.externalSpaceId === 'string' && data.externalSpaceId.trim() ? data.externalSpaceId.trim() : null,
    customerCodes,
    contactIds,
  } };
}
