import 'server-only';
import { JWT } from 'google-auth-library';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export class GoogleCalendarConfigurationError extends Error {}
export class GoogleCalendarRequestError extends Error {}

export type GoogleMeetEventInput = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
};

export type GoogleMeetEvent = {
  joinUrl: string;
  externalSpaceId: string;
  calendarEventUrl: string | null;
};

type GoogleCalendarEventResponse = {
  id?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    createRequest?: { status?: { statusCode?: string } };
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
};

function readConfiguration() {
  const serviceAccountEmail = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  const organizerEmail = process.env.GOOGLE_CALENDAR_ORGANIZER_EMAIL?.trim();
  if (!serviceAccountEmail || !privateKey || !organizerEmail) {
    throw new GoogleCalendarConfigurationError(
      'Google Calendar自動発行の環境変数が未設定です。システム管理者にお問い合わせください。',
    );
  }
  if (!organizerEmail.toLowerCase().endsWith('@biogaia.jp')) {
    throw new GoogleCalendarConfigurationError('開催者は @biogaia.jp のGoogle Workspaceアカウントを指定してください。');
  }
  return { serviceAccountEmail, privateKey, organizerEmail };
}

function videoEntryPoint(event: GoogleCalendarEventResponse) {
  const candidate = event.hangoutLink ?? event.conferenceData?.entryPoints
    ?.find((entry) => entry.entryPointType === 'video')?.uri;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && url.hostname === 'meet.google.com' ? url.toString() : null;
  } catch {
    return null;
  }
}

async function parseGoogleResponse(response: Response) {
  const body = await response.json().catch(() => null) as GoogleCalendarEventResponse & {
    error?: { message?: string; status?: string };
  } | null;
  if (!response.ok) {
    const details = body?.error?.message;
    throw new GoogleCalendarRequestError(details ? `Google Calendar: ${details}` : 'Google Calendarへの接続に失敗しました。');
  }
  return body ?? {};
}

async function waitForMeetUrl(eventId: string, accessToken: string) {
  for (const delay of [200, 500, 1000, 1500]) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const event = await parseGoogleResponse(response);
    const joinUrl = videoEntryPoint(event);
    if (joinUrl) return { event, joinUrl };
    if (event.conferenceData?.createRequest?.status?.statusCode === 'failure') break;
  }
  throw new GoogleCalendarRequestError('Google Meetの発行が時間内に完了しませんでした。Google Calendarを確認してください。');
}

export async function createGoogleMeetEvent(input: GoogleMeetEventInput): Promise<GoogleMeetEvent> {
  const { serviceAccountEmail, privateKey, organizerEmail } = readConfiguration();
  const authClient = new JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: [CALENDAR_SCOPE],
    subject: organizerEmail,
  });
  const credentials = await authClient.authorize().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    throw new GoogleCalendarRequestError(`Google Calendar認証に失敗しました: ${message}`);
  });
  if (!credentials.access_token) throw new GoogleCalendarRequestError('Google Calendarのアクセストークンを取得できませんでした。');

  const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: input.title,
      description: input.description || undefined,
      start: { dateTime: input.startsAt, timeZone: input.timezone },
      end: { dateTime: input.endsAt, timeZone: input.timezone },
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }),
    cache: 'no-store',
  });
  let event = await parseGoogleResponse(response);
  if (!event.id) throw new GoogleCalendarRequestError('Google Calendarから予定IDが返されませんでした。');
  const eventId = event.id;
  let joinUrl = videoEntryPoint(event);
  if (!joinUrl) {
    const completed = await waitForMeetUrl(eventId, credentials.access_token);
    event = completed.event;
    joinUrl = completed.joinUrl;
  }
  return { joinUrl, externalSpaceId: eventId, calendarEventUrl: event.htmlLink ?? null };
}

export function isGoogleCalendarConfigured() {
  try {
    readConfiguration();
    return true;
  } catch {
    return false;
  }
}
