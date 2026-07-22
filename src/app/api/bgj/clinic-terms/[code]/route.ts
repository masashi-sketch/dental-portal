import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CLINIC_TERMS_COLUMNS } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_terms')
    .select(CLINIC_TERMS_COLUMNS)
    .eq('customer_code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ terms: data });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!requireBgjSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await params;
  const body = await request.json();
  const {
    commissionRate,
    wholesaleRate,
    paymentTermsSite,
    paymentMethod,
    contractStartedAt,
    contractRenewalAt,
  } = body ?? {};

  if (wholesaleRate !== undefined
    && (typeof wholesaleRate !== 'number' || !Number.isFinite(wholesaleRate) || wholesaleRate < 0 || wholesaleRate > 100)) {
    return NextResponse.json({ error: '仕切値率は0〜100%で指定してください。' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('clinic_terms')
    .upsert(
      {
        customer_code: code,
        commission_rate: commissionRate ?? 0,
        wholesale_rate: wholesaleRate ?? 0,
        payment_terms_site: paymentTermsSite || null,
        payment_method: paymentMethod || null,
        contract_started_at: contractStartedAt || null,
        contract_renewal_at: contractRenewalAt || null,
        updated_by: session.user.email,
      },
      { onConflict: 'customer_code' }
    )
    .select(CLINIC_TERMS_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ terms: data });
}
