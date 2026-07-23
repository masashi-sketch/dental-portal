import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import {
  createGoogleMeetEvent,
  GoogleCalendarConfigurationError,
  GoogleCalendarRequestError,
  isGoogleCalendarConfigured,
} from '@/lib/webinars/googleCalendar';
import { parseGoogleMeetEventInput } from '@/lib/webinars/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ configured: isGoogleCalendarConfigured() });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = parseGoogleMeetEventInput(await request.json().catch(() => null));
  if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const event = await createGoogleMeetEvent(parsed.value);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof GoogleCalendarConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof GoogleCalendarRequestError) {
      console.error('Google Meet creation failed:', error);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error('Unexpected Google Meet creation failure:', error);
    return NextResponse.json({ error: 'Google Meetを発行できませんでした。' }, { status: 500 });
  }
}
