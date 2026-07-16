import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { DbTableUsage } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const [
    { data: totalBytes, error: totalError },
    { data: tables, error: tablesError },
  ] = await Promise.all([
    supabase.rpc<'bgj_db_total_size', number>('bgj_db_total_size'),
    supabase.rpc<'bgj_db_table_usage', DbTableUsage[]>('bgj_db_table_usage'),
  ]);

  if (totalError || tablesError) {
    return NextResponse.json({ error: (totalError ?? tablesError)?.message }, { status: 500 });
  }

  return NextResponse.json({ totalBytes: totalBytes ?? 0, tables: tables ?? [] });
}
