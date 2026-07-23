// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
const createGoogleMeetEvent = vi.fn();
vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
vi.mock('@/lib/webinars/googleCalendar', () => ({
  createGoogleMeetEvent,
  isGoogleCalendarConfigured: () => true,
  GoogleCalendarConfigurationError: class extends Error {},
  GoogleCalendarRequestError: class extends Error {},
}));

const { GET, POST } = await import('./route');
const bgjSession = { user: { role: 'bgj', email: 'staff@biogaia.jp' }, expires: '2099-01-01' } as Session;
const input = { title: '説明会', description: '', startsAt: '2026-08-01T01:00:00Z', endsAt: '2026-08-01T02:00:00Z', timezone: 'Asia/Tokyo' };

describe('/api/bgj/webinars/google-meet', () => {
  beforeEach(() => { sessionValue = null; createGoogleMeetEvent.mockReset(); });
  it('BGJ以外を拒否する', async () => { expect((await GET()).status).toBe(401); });
  it('Google CalendarでMeetを発行する', async () => {
    sessionValue = bgjSession;
    createGoogleMeetEvent.mockResolvedValue({ joinUrl: 'https://meet.google.com/abc-defg-hij', externalSpaceId: 'event-1', calendarEventUrl: null });
    const response = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(input) }) as never);
    expect(response.status).toBe(201);
    expect(createGoogleMeetEvent).toHaveBeenCalledWith(expect.objectContaining({ title: '説明会', startsAt: '2026-08-01T01:00:00.000Z' }));
  });
  it('不正な日時を拒否する', async () => {
    sessionValue = bgjSession;
    const response = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ ...input, endsAt: input.startsAt }) }) as never);
    expect(response.status).toBe(400);
    expect(createGoogleMeetEvent).not.toHaveBeenCalled();
  });
});
