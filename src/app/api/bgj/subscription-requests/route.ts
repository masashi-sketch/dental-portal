import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_REQUEST_WITH_DETAILS_COLUMNS, type SubscriptionRequestStatus } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
const STATUSES: SubscriptionRequestStatus[] = ['submitted', 'approved', 'rejected', 'canceled'];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const status = params.get('status');
  const customerCode = params.get('customerCode')?.trim() ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = 50;
  if (status && !STATUSES.includes(status as SubscriptionRequestStatus)) return NextResponse.json({ error: '状態が不正です。' }, { status: 400 });
  let query = getSupabaseServerClient().from('patient_subscription_requests')
    .select(SUBSCRIPTION_REQUEST_WITH_DETAILS_COLUMNS, { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (status) query = query.eq('status', status);
  if (customerCode) query = query.eq('customer_code', customerCode);
  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [], total: count ?? 0, page, pageSize });
}
