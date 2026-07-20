// @vitest-environment node
// 商品マスタの画像アップロードAPI。BGJ限定の認可・ファイル種別/サイズ検証・
// Storageへのアップロード呼び出しを確認する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const uploadSpy = vi.fn();
let uploadError: { message: string } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: unknown, options: unknown) => {
          uploadSpy(bucket, path, options);
          return { data: uploadError ? null : { path }, error: uploadError };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/product-images/${path}` },
        }),
      }),
    },
  }),
}));

const { POST } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeRequest(formData: FormData) {
  return new Request('http://localhost/api/bgj/products/upload-image', {
    method: 'POST',
    body: formData,
  }) as unknown as Parameters<typeof POST>[0];
}

function makeFile(name: string, type: string, sizeBytes = 10) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('POST /api/bgj/products/upload-image', () => {
  beforeEach(() => {
    sessionValue = null;
    uploadError = null;
    uploadSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const fd = new FormData();
    fd.append('file', makeFile('a.png', 'image/png'));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(401);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('clinicロールは403相当（401でUnauthorized）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const fd = new FormData();
    fd.append('file', makeFile('a.png', 'image/png'));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(401);
  });

  it('fileが無ければ400', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest(new FormData()));
    expect(res.status).toBe(400);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('許可されていないMIMEタイプなら400', async () => {
    sessionValue = makeSession();
    const fd = new FormData();
    fd.append('file', makeFile('a.svg', 'image/svg+xml'));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('5MBを超える場合は400', async () => {
    sessionValue = makeSession();
    const fd = new FormData();
    fd.append('file', makeFile('a.png', 'image/png', 5 * 1024 * 1024 + 1));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('bgjロールが正しい画像をアップロードすると公開URLを返す', async () => {
    sessionValue = makeSession();
    const fd = new FormData();
    fd.append('file', makeFile('a.png', 'image/png'));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(201);
    expect(uploadSpy).toHaveBeenCalledWith('product-images', expect.stringMatching(/\.png$/), { contentType: 'image/png' });
    const body = await res.json();
    expect(body.url).toContain('https://example.supabase.co/storage/v1/object/public/product-images/');
  });

  it('Storageアップロードが失敗した場合は500', async () => {
    sessionValue = makeSession();
    uploadError = { message: 'storage error' };
    const fd = new FormData();
    fd.append('file', makeFile('a.png', 'image/png'));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(500);
  });
});
