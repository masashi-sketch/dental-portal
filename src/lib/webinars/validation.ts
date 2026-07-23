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
  customerCodes: string[];
};

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

export function parseWebinarDraftInput(body: unknown): { value?: WebinarDraftInput; error?: string } {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const provider = data.provider;
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const startsAt = typeof data.startsAt === 'string' ? data.startsAt : '';
  const endsAt = typeof data.endsAt === 'string' ? data.endsAt : '';
  const timezone = typeof data.timezone === 'string' ? data.timezone.trim() : '';
  const joinUrl = typeof data.joinUrl === 'string' ? data.joinUrl.trim() : '';
  const customerCodes = Array.isArray(data.customerCodes)
    ? [...new Set(data.customerCodes.filter((code): code is string => typeof code === 'string').map((code) => code.trim()).filter(Boolean))]
    : [];
  const startTime = Date.parse(startsAt);
  const endTime = Date.parse(endsAt);

  if (!title || title.length > 200) return { error: 'タイトルは200文字以内で入力してください。' };
  if (provider !== 'google_meet' && provider !== 'zoom') return { error: '配信サービスを選択してください。' };
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return { error: '終了日時は開始日時より後にしてください。' };
  if (endTime - startTime > 12 * 60 * 60 * 1000) return { error: '開催時間は12時間以内にしてください。' };
  if (!timezone || !isValidTimezone(timezone)) return { error: 'タイムゾーンが不正です。' };
  if (!isProviderUrl(provider, joinUrl)) return { error: provider === 'google_meet' ? 'meet.google.com の参加URLを入力してください。' : 'zoom.us の参加URLを入力してください。' };
  if (customerCodes.length === 0 || customerCodes.length > 500) return { error: '対象医院を1件以上選択してください。' };

  return { value: {
    id: typeof data.id === 'string' && data.id ? data.id : null,
    version: Number.isInteger(data.version) && Number(data.version) > 0 ? Number(data.version) : 1,
    title,
    description: typeof data.description === 'string' ? data.description.trim().slice(0, 5000) : '',
    provider,
    startsAt: new Date(startTime).toISOString(),
    endsAt: new Date(endTime).toISOString(),
    timezone,
    joinUrl,
    customerCodes,
  } };
}

