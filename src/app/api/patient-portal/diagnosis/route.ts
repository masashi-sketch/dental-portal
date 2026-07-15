import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getScopedSupabaseClient } from '@/lib/auth/scopedSupabaseClient';
import { resolveEffectivePatientId } from '@/lib/auth/patientScope';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const serviceClient = getSupabaseServerClient();
  const patientId = await resolveEffectivePatientId(serviceClient, session);

  if (!patientId || !session) {
    return NextResponse.json({ diagnosis: null });
  }

  // 診断データ本体はDBレベルのRLSも効くscopedクライアントで取得する
  // （アプリ側のスコープ判定に万一誤りがあっても、DBが他人の診断を返さない）
  const scoped = getScopedSupabaseClient(session);

  const { data: diagnosisRows, error: diagnosisError } = await scoped
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
    scoped.from('periodontal_stages').select('code, label, name, description').eq('code', latest.stage_code).single(),
    scoped.from('periodontal_grades').select('code, label, name, description').eq('code', latest.grade_code).single(),
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
