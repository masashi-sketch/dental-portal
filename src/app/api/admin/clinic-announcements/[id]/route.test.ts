// @vitest-environment node
// isClinicResourceInScope（src/lib/auth/clinicScope.ts）による所有権チェックを経由する
// ため、clinicロールが他院のお知らせを編集・削除できないことを検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let scopeRow: { customer_code: string } | null = { customer_code: 'A000001' };
const updateSpy = vi.fn();
const deleteSpy = vi.fn();
const updatedRow = {
  id: 'ann-1',
  customer_code: 'A000001',
  announcement_date: '2026-07-02',
  tag: '重要',
  text: '更新後の本文',
  status: '公開',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-02T00:00:00Z',
};

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'clinic_announcements') throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: scopeRow, error: null }),
          }),
        }),
        update: (patch: Record<string, unknown>) => {
          updateSpy(patch);
          return { eq: () => ({ select: () => ({ single: async () => ({ data: updatedRow, error: null }) }) }) };
        },
        delete: () => {
          deleteSpy();
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  }),
}));

const { PATCH, DELETE } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'clinic', customerCode: 'A000001', patientId: null, ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as Parameters<typeof PATCH>[0];
}

const params = Promise.resolve({ id: 'ann-1' });

describe('PATCH /api/admin/clinic-announcements/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    scopeRow = { customer_code: 'A000001' };
    updateSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await PATCH(makeRequest({ text: 'x' }), { params });
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('自院のお知らせは更新できる', async () => {
    sessionValue = makeSession();
    const res = await PATCH(makeRequest({ text: '更新後の本文', tag: '重要' }), { params });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith({ text: '更新後の本文', tag: '重要' });
  });

  it('他院のお知らせは404で拒否される', async () => {
    sessionValue = makeSession();
    scopeRow = { customer_code: 'B999999' };
    const res = await PATCH(makeRequest({ text: 'x' }), { params });
    expect(res.status).toBe(404);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/admin/clinic-announcements/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    scopeRow = { customer_code: 'A000001' };
    deleteSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await DELETE(new Request('http://localhost') as never, { params });
    expect(res.status).toBe(401);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('自院のお知らせは削除できる', async () => {
    sessionValue = makeSession();
    const res = await DELETE(new Request('http://localhost') as never, { params });
    expect(res.status).toBe(200);
    expect(deleteSpy).toHaveBeenCalled();
  });

  it('他院のお知らせは404で拒否される', async () => {
    sessionValue = makeSession();
    scopeRow = { customer_code: 'B999999' };
    const res = await DELETE(new Request('http://localhost') as never, { params });
    expect(res.status).toBe(404);
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
