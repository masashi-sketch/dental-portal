import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PRODUCT_COLUMNS } from '@/lib/supabase/types';
import { validateProductBody } from '../validation';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const validation = validateProductBody(body);
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('products')
    .update(validation.row)
    .eq('id', id)
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    // productsのunique制約はproduct_codeのみ（nullは複数許容）のため、
    // ここでの一意制約違反は商品コードの重複と判断できる。
    if (error.code === '23505') {
      return NextResponse.json({ error: 'この商品コードは既に使用されています。' }, { status: 409 });
    }
    console.error('PATCH /api/bgj/products/[id] failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ product: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
