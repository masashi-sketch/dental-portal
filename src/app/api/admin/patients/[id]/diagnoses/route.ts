import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  PERIODONTAL_DIAGNOSIS_COLUMNS,
  PERIODONTAL_GRADE_COLUMNS,
  PERIODONTAL_STAGE_COLUMNS,
  type PeriodontalGrade,
  type PeriodontalStage,
} from '@/lib/supabase/types';
import { isPatientInScope } from '@/lib/auth/clinicScope';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isPatientInScope(supabase, id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const [
    { data: diagnoses, error: diagnosesError },
    { data: stages, error: stagesError },
    { data: grades, error: gradesError },
  ] = await Promise.all([
    supabase
      .from('periodontal_diagnoses')
      .select(PERIODONTAL_DIAGNOSIS_COLUMNS)
      .eq('patient_id', id)
      .order('diagnosed_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('periodontal_stages').select(PERIODONTAL_STAGE_COLUMNS),
    supabase.from('periodontal_grades').select(PERIODONTAL_GRADE_COLUMNS),
  ]);

  if (diagnosesError || stagesError || gradesError) {
    return NextResponse.json(
      { error: (diagnosesError ?? stagesError ?? gradesError)?.message },
      { status: 500 }
    );
  }

  const stageMap = new Map((stages as PeriodontalStage[] ?? []).map((s) => [s.code, s]));
  const gradeMap = new Map((grades as PeriodontalGrade[] ?? []).map((g) => [g.code, g]));

  const merged = (diagnoses ?? []).map((d) => ({
    ...d,
    stage: stageMap.get(d.stage_code) ?? null,
    grade: gradeMap.get(d.grade_code) ?? null,
  }));

  return NextResponse.json({ diagnoses: merged });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!(await isPatientInScope(supabase, id, session))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const body = await request.json();
  const { stageCode, gradeCode, diagnosedAt, memo } = body ?? {};

  if (!stageCode || !gradeCode) {
    return NextResponse.json({ error: 'ステージとグレードは必須です。' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('periodontal_diagnoses')
    .insert({
      patient_id: id,
      stage_code: stageCode,
      grade_code: gradeCode,
      diagnosed_at: diagnosedAt || undefined,
      memo: memo || null,
      created_by: session.user.email ?? `clinic:${session.user.customerCode}`,
    })
    .select(PERIODONTAL_DIAGNOSIS_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ diagnosis: data }, { status: 201 });
}
