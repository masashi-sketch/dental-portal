import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const patientId = cookieStore.get('demo-patient-id')?.value;

  if (!patientId) {
    return NextResponse.json({ diagnosis: null });
  }

  const supabase = getSupabaseServerClient();
  const { data: diagnosisRows, error: diagnosisError } = await supabase
    .from('periodontal_diagnoses')
    .select('stage_code, grade_code, diagnosed_at, memo')
    .eq('patient_id', patientId)
    .order('diagnosed_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (diagnosisError) {
    return NextResponse.json({ error: diagnosisError.message }, { status: 500 });
  }

  const latest = diagnosisRows?.[0];
  if (!latest) {
    return NextResponse.json({ diagnosis: null });
  }

  const [{ data: stage }, { data: grade }] = await Promise.all([
    supabase.from('periodontal_stages').select('code, label, name, description').eq('code', latest.stage_code).single(),
    supabase.from('periodontal_grades').select('code, label, name, description').eq('code', latest.grade_code).single(),
  ]);

  return NextResponse.json({
    diagnosis: {
      diagnosedAt: latest.diagnosed_at,
      memo: latest.memo,
      stage,
      grade,
    },
  });
}
