// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const updateSpy = vi.fn();
const deleteSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      update: (patch: Record<string, unknown>) => {
        updateSpy(patch);
        return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'role-1', ...patch }, error: null }) }) }) };
      },
      delete: () => {
        deleteSpy();
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

const { PATCH, DELETE } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/bgj/staff-roles/role-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 'role-1' });

describe('PATCH/DELETE /api/bgj/staff-roles/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    updateSpy.mockReset();
    deleteSpy.mockReset();
  });

  it('未認証なら401（更新しない）', async () => {
    const res = await PATCH(patchRequest({ name: '副院長' }), { params });
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('役職名が無いと400（更新しない）', async () => {
    sessionValue = makeSession();
    const res = await PATCH(patchRequest({}), { params });
    expect(res.status).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('更新できる', async () => {
    sessionValue = makeSession();
    const res = await PATCH(patchRequest({ name: '副院長' }), { params });
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith({ name: '副院長' });
  });

  it('未認証なら削除も401（削除しない）', async () => {
    const res = await DELETE(new NextRequest('http://localhost/api/bgj/staff-roles/role-1'), { params });
    expect(res.status).toBe(401);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('削除できる', async () => {
    sessionValue = makeSession();
    const res = await DELETE(new NextRequest('http://localhost/api/bgj/staff-roles/role-1'), { params });
    expect(res.status).toBe(200);
    expect(deleteSpy).toHaveBeenCalled();
  });
});
