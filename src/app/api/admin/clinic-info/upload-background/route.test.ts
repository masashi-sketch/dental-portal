// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({ auth: async () => sessionValue }));

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
    user: { role: 'clinic', customerCode: 'A000001', patientId: null, email: 'clinic@example.com', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeRequest(formData: FormData) {
  return new Request('http://localhost/api/admin/clinic-info/upload-background', {
    method: 'POST',
    body: formData,
  }) as unknown as Parameters<typeof POST>[0];
}

function makeFile(name: string, type: string, sizeBytes = 10) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('POST /api/admin/clinic-info/upload-background', () => {
  beforeEach(() => {
    sessionValue = null;
    uploadError = null;
    uploadSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const fd = new FormData();
    fd.append('file', makeFile('background.png', 'image/png'));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(401);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('BGJロールはアップロードできない', async () => {
    sessionValue = makeSession({ role: 'bgj', customerCode: null });
    const fd = new FormData();
    fd.append('file', makeFile('background.png', 'image/png'));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(401);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('画像以外のファイルは400', async () => {
    sessionValue = makeSession();
    const fd = new FormData();
    fd.append('file', makeFile('background.svg', 'image/svg+xml'));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('5MBを超える画像は400', async () => {
    sessionValue = makeSession();
    const fd = new FormData();
    fd.append('file', makeFile('background.png', 'image/png', 5 * 1024 * 1024 + 1));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('自院用パスへ画像をアップロードして公開URLを返す', async () => {
    sessionValue = makeSession();
    const fd = new FormData();
    fd.append('file', makeFile('background.webp', 'image/webp'));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(201);
    expect(uploadSpy).toHaveBeenCalledWith(
      'product-images',
      expect.stringMatching(/^clinic-backgrounds\/A000001\/.+\.webp$/),
      { contentType: 'image/webp' },
    );
    expect((await res.json()).url).toContain('/clinic-backgrounds/A000001/');
  });

  it('Storageへの保存に失敗した場合は500', async () => {
    sessionValue = makeSession();
    uploadError = { message: 'storage error' };
    const fd = new FormData();
    fd.append('file', makeFile('background.png', 'image/png'));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(500);
  });
});
