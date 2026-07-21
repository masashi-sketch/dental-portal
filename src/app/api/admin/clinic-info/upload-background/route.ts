import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BUCKET = 'product-images';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// 医院自身が患者ポータルの背景画像を登録するための専用API。
// publicな既存Storageバケットを使うが、書き込みはclinicロールかつ自院のパスに限定する。
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'clinic' || !session.user.customerCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '画像ファイルを選択してください。' }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: '対応していない画像形式です（jpeg/png/webp/gifのみ）。' }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: '画像サイズは5MB以内にしてください。' }, { status: 400 });
  }

  const safeCustomerCode = session.user.customerCode.replace(/[^A-Za-z0-9_-]/g, '_');
  const path = `clinic-backgrounds/${safeCustomerCode}/${randomUUID()}.${extension}`;
  const supabase = getSupabaseServerClient();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error('POST /api/admin/clinic-info/upload-background failed:', uploadError);
    return NextResponse.json({ error: '背景画像のアップロードに失敗しました。' }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
