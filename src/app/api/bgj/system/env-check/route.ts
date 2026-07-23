import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

// 値は絶対に返さない。設定有無（真偽値）のみを返す一覧。
const REQUIRED_ENV_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY',
  'GOOGLE_CALENDAR_ORGANIZER_EMAIL',
  'AUTH_SECRET',
  'AUTH_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_JWT_SECRET',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  'WORKSPACE_SMTP_USER',
  'WORKSPACE_SMTP_APP_PASSWORD',
  'WORKSPACE_SENDER_ALIAS',
] as const;

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envVars = REQUIRED_ENV_VARS.map((name) => ({
    name,
    configured: !!process.env[name],
  }));

  return NextResponse.json({ envVars });
}
