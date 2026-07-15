import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PERIODONTAL_GRADE_COLUMNS, PERIODONTAL_STAGE_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const [{ data: stages, error: stagesError }, { data: grades, error: gradesError }] = await Promise.all([
    supabase.from('periodontal_stages').select(PERIODONTAL_STAGE_COLUMNS).order('sort_order', { ascending: true }).limit(50),
    supabase.from('periodontal_grades').select(PERIODONTAL_GRADE_COLUMNS).order('sort_order', { ascending: true }).limit(50),
  ]);

  if (stagesError || gradesError) {
    return NextResponse.json({ error: (stagesError ?? gradesError)?.message }, { status: 500 });
  }

  return NextResponse.json({ stages, grades });
}
