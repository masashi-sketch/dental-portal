// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const updateSpy = vi.fn();
const deleteSpy = vi.fn();
const updatedRow = {
  id: 'link-1',
  label: 'Biogaia学術情報',
  url: 'https://reuteri-lab.jp/post/research',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'bgj_external_links') throw new Error(`unexpected table: ${table}`);
      return {
        update: (row: Record<string, unknown>) => {
          updateSpy(row);
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({ data: updatedRow, error: null }),
              }),
            }),
          };
        },
        delete: () => ({
          eq: (...args: unknown[]) => {
            deleteSpy(...args);
            return Promise.resolve({ error: null });
          },
        }),
      };
    },
  }),
}));

const { PATCH, DELETE } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePatchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/bgj/external-links/link-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0];
}

describe('PATCH /api/bgj/external-links/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    updateSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await PATCH(makePatchRequest({ label: 'A', url: 'https://a.example' }), makeParams('link-1'));
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('clinicロールは編集不可（401）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await PATCH(makePatchRequest({ label: 'A', url: 'https://a.example' }), makeParams('link-1'));
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('表示名称かリンクURLが無ければ400', async () => {
    sessionValue = makeSession();
    const res = await PATCH(makePatchRequest({ label: 'A' }), makeParams('link-1'));
    expect(res.status).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('bgjロールなら更新できる', async () => {
    sessionValue = makeSession();
    const res = await PATCH(makePatchRequest({ label: 'Biogaia学術情報', url: 'https://reuteri-lab.jp/post/research' }), makeParams('link-1'));
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith({ label: 'Biogaia学術情報', url: 'https://reuteri-lab.jp/post/research' });
  });
});

describe('DELETE /api/bgj/external-links/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    deleteSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await DELETE(new Request('http://localhost/api/bgj/external-links/link-1', { method: 'DELETE' }) as unknown as Parameters<typeof DELETE>[0], makeParams('link-1'));
    expect(res.status).toBe(401);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('bgjロールなら削除できる', async () => {
    sessionValue = makeSession();
    const res = await DELETE(new Request('http://localhost/api/bgj/external-links/link-1', { method: 'DELETE' }) as unknown as Parameters<typeof DELETE>[0], makeParams('link-1'));
    expect(res.status).toBe(200);
    expect(deleteSpy).toHaveBeenCalled();
  });
});
