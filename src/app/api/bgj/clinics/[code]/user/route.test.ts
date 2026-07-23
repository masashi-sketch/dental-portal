// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const requireBgjSessionMock = vi.fn(() => true);
vi.mock('@/lib/auth/clinicScope', () => ({
  requireBgjSession: (...args: unknown[]) => requireBgjSessionMock(...(args as [])),
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(async () => ({ user: { role: 'bgj' } })),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: vi.fn(),
  }),
}));

const { POST, PATCH } = await import('./route');

function jsonRequest(method: string, body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/bgj/clinics/A000001/user', {
    method,
    body: JSON.stringify(body),
  });
}

describe('/api/bgj/clinics/[code]/user', () => {
  beforeEach(() => {
    requireBgjSessionMock.mockReturnValue(true);
  });

  it('POST: 旧発行経路を410で終了する', async () => {
    const req = jsonRequest('POST', { loginId: 'chuo-shika', password: 'initpass123', email: 'staff@example.com' });
    const res = await POST(req, { params: Promise.resolve({ code: 'A000001' }) });
    expect(res.status).toBe(410);
    await expect(res.json()).resolves.toEqual({ error: 'ログインの発行・変更は担当者管理一覧から行ってください。' });
  });

  it('PATCH: 旧更新経路を410で終了する', async () => {
    const req = jsonRequest('PATCH', { id: 'u1', email: 'staff2@example.com' });
    const res = await PATCH(req, { params: Promise.resolve({ code: 'A000001' }) });
    expect(res.status).toBe(410);
  });
});
