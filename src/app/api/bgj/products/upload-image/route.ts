import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/auth';
import { requireBgjSession } from '@/lib/auth/clinicScope';
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

// 商品マスタの画像アップロード専用（BGJ限定）。Storageバケットはpublicで作成済み・
// storage.objectsへのポリシーは定義しないため、書き込みはこのAPI（service_roleキー）
// 経由のみに限定される。
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!requireBgjSession(session)) {
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

  const path = `${randomUUID()}.${extension}`;
  const supabase = getSupabaseServerClient();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error('POST /api/bgj/products/upload-image failed:', uploadError);
    return NextResponse.json({ error: '画像のアップロードに失敗しました。' }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
