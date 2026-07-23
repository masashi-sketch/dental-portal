// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
const targetEqSpy = vi.fn();
const webinarIdInSpy = vi.fn();
vi.mock('@/lib/supabase/server', () => ({ getSupabaseServerClient: () => ({ from: (table: string) => {
  if (table === 'webinar_target_clinics') return { select: () => ({ eq: (column: string, value: string) => { targetEqSpy(column, value); return Promise.resolve({ data: [{ webinar_id: 'webinar-1' }], error: null }); } }) };
  return { select: () => ({ eq: () => ({ in: (column: string, ids: string[]) => { webinarIdInSpy(column, ids); return { order: () => ({ limit: async () => ({ data: [{ id: 'webinar-1' }], error: null }) }) }; } }) }) };
} }) }));
const { GET } = await import('./route');

describe('GET /api/admin/webinars', () => {
  beforeEach(() => { sessionValue = null; targetEqSpy.mockClear(); webinarIdInSpy.mockClear(); });
  it('未認証とBGJロールを拒否する', async () => { expect((await GET()).status).toBe(401); sessionValue = { user: { role: 'bgj', email: 'x@biogaia.jp' }, expires: '2099' } as Session; expect((await GET()).status).toBe(401); });
  it('セッションの得意先コードで対象表を絞り、公開中だけ返す', async () => {
    sessionValue = { user: { role: 'clinic', customerCode: 'A000001' }, expires: '2099' } as Session;
    const response = await GET();
    expect(response.status).toBe(200);
    expect(targetEqSpy).toHaveBeenCalledWith('customer_code', 'A000001');
    expect(webinarIdInSpy).toHaveBeenCalledWith('id', ['webinar-1']);
  });
});
