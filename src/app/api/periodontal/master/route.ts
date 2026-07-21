import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCachedPeriodontalMaster } from '@/lib/periodontalMaster';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { stages, grades } = await getCachedPeriodontalMaster();
    return NextResponse.json({ stages, grades });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'エラーが発生しました' }, { status: 500 });
  }
}
