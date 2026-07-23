// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authorize = vi.fn();
vi.mock('google-auth-library', () => ({ JWT: class { authorize = authorize; } }));

const { createGoogleMeetEvent, GoogleCalendarConfigurationError } = await import('./googleCalendar');
const input = {
  title: '医院向け説明会', description: '説明',
  startsAt: '2026-08-01T01:00:00.000Z', endsAt: '2026-08-01T02:00:00.000Z', timezone: 'Asia/Tokyo',
};

describe('createGoogleMeetEvent', () => {
  beforeEach(() => {
    vi.restoreAllMocks(); authorize.mockReset();
    process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL = 'calendar-service@example.iam.gserviceaccount.com';
    process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY = 'private-key';
    process.env.GOOGLE_CALENDAR_ORGANIZER_EMAIL = 'webinar@biogaia.jp';
  });

  it('Calendar予定と固有Meet URLを作成する', async () => {
    authorize.mockResolvedValue({ access_token: 'access-token' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: 'calendar-event-1', htmlLink: 'https://calendar.google.com/event?eid=1',
      hangoutLink: 'https://meet.google.com/abc-defg-hij',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(createGoogleMeetEvent(input)).resolves.toEqual({
      joinUrl: 'https://meet.google.com/abc-defg-hij', externalSpaceId: 'calendar-event-1',
      calendarEventUrl: 'https://calendar.google.com/event?eid=1',
    });
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('conferenceDataVersion=1'), expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
    }));
    const request = fetchSpy.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toEqual(expect.objectContaining({
      summary: '医院向け説明会', conferenceData: { createRequest: expect.objectContaining({ conferenceSolutionKey: { type: 'hangoutsMeet' } }) },
    }));
  });

  it('必須環境変数が無ければ外部通信前に拒否する', async () => {
    delete process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY;
    await expect(createGoogleMeetEvent(input)).rejects.toBeInstanceOf(GoogleCalendarConfigurationError);
    expect(authorize).not.toHaveBeenCalled();
  });
});
