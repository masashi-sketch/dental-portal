import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_BRANDING_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// 意図的に認証不要（患者ポータルのログイン画面＝未認証状態から呼ばれる）。
// 表示名・背景画像URLという非機微なブランディング情報の2つだけを返し、
// 住所・電話番号など他の得意先情報は一切含めない。
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinics')
    .select(CLINIC_BRANDING_COLUMNS)
    .eq('customer_code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ displayName: null, backgroundUrl: null });

  return NextResponse.json({
    displayName: data.display_name ?? data.name,
    backgroundUrl: data.patient_background_url,
  });
}
