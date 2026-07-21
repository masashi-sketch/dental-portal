import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCachedPeriodontalMaster } from '@/lib/periodontalMaster';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  PATIENT_PUBLIC_COLUMNS,
  PERIODONTAL_DIAGNOSIS_COLUMNS,
  type PeriodontalGrade,
  type PeriodontalStage,
} from '@/lib/supabase/types';
import { ServerTiming } from '@/lib/serverTiming';

export const dynamic = 'force-dynamic';

// 患者詳細の初期表示専用。認証を1回に集約し、患者・診断・共有マスタを並列取得する。
// 更新処理は責務を分けるため、従来の患者／診断APIをそのまま使用する。
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const timing = new ServerTiming();
  const session = await auth();
  timing.mark('auth');
  if (!session?.user || session.user.role === 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  let patientQuery = supabase.from('patients').select(PATIENT_PUBLIC_COLUMNS).eq('id', id);
  if (session.user.role === 'clinic') {
    patientQuery = patientQuery.eq('customer_code', session.user.customerCode);
  }

  try {
    const [patientResult, diagnosesResult, master] = await Promise.all([
      patientQuery.maybeSingle(),
      supabase
        .from('periodontal_diagnoses')
        .select(PERIODONTAL_DIAGNOSIS_COLUMNS)
        .eq('patient_id', id)
        .order('diagnosed_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100),
      getCachedPeriodontalMaster(),
    ]);
    timing.mark('database');

    if (patientResult.error || diagnosesResult.error) {
      return NextResponse.json(
        { error: (patientResult.error ?? diagnosesResult.error)?.message },
        { status: 500 },
      );
    }
    if (!patientResult.data) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    const stageMap = new Map((master.stages as PeriodontalStage[]).map((stage) => [stage.code, stage]));
    const gradeMap = new Map((master.grades as PeriodontalGrade[]).map((grade) => [grade.code, grade]));
    const diagnoses = (diagnosesResult.data ?? []).map((diagnosis) => ({
      ...diagnosis,
      stage: stageMap.get(diagnosis.stage_code) ?? null,
      grade: gradeMap.get(diagnosis.grade_code) ?? null,
    }));

    return NextResponse.json(
      { patient: patientResult.data, diagnoses, stages: master.stages, grades: master.grades },
      { headers: { 'Server-Timing': timing.header() } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'エラーが発生しました' },
      { status: 500 },
    );
  }
}
