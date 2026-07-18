import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { EXTERNAL_LINK_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// 医院用ポータルのサイドバー「LINKS」欄からも読み取るため、GETはBGJ限定にせず
// 任意の認証済みセッション（bgj/clinic/patient）で許可する。
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('bgj_external_links')
    .select(EXTERNAL_LINK_COLUMNS)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ externalLinks: data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { label, url } = body ?? {};
  if (!label || !url) {
    return NextResponse.json({ error: '表示名称とリンクURLは必須です。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('bgj_external_links')
    .insert({ label, url })
    .select(EXTERNAL_LINK_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ externalLink: data }, { status: 201 });
}
