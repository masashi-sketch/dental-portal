import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PRODUCT_COLUMNS } from '@/lib/supabase/types';
import { validateProductBody } from './validation';

export const dynamic = 'force-dynamic';

// 商品マスタ（BGJポータル /bgj/master/products 専用）。クリニック側は
// /api/admin/product-settings、患者ポータルは /api/patient-portal/products の
// 専用APIから読むため、GETもBGJ限定にする。
export async function GET() {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateProductBody(body);
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('products')
    .insert(validation.row)
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    console.error('POST /api/bgj/products failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ product: data }, { status: 201 });
}
