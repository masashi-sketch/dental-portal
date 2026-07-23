// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

const afterCallbacks: Array<() => Promise<void>> = [];
vi.mock('next/server', async (importOriginal) => {
  const original = await importOriginal<typeof import('next/server')>();
  return { ...original, after: (callback: () => Promise<void>) => afterCallbacks.push(callback) };
});
let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
const rpcSpy = vi.fn(async () => ({ data: 'webinar-1', error: null }));
vi.mock('@/lib/supabase/server', () => ({ getSupabaseServerClient: () => ({ rpc: rpcSpy, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }) }) }));
vi.mock('@/lib/webinars/notifyClinics', () => ({ notifyClinicsAboutWebinar: vi.fn(async () => {}) }));
const { PATCH } = await import('./route');
const context = { params: Promise.resolve({ id: 'webinar-1' }) };
function request(body: unknown) { return new Request('http://localhost/api/bgj/webinars/webinar-1', { method: 'PATCH', body: JSON.stringify(body) }) as never; }

describe('PATCH /api/bgj/webinars/[id]', () => {
  beforeEach(() => { sessionValue = null; rpcSpy.mockClear(); afterCallbacks.length = 0; });
  it('BGJ以外を拒否する', async () => { expect((await PATCH(request({ status: 'published', version: 1 }), context)).status).toBe(401); });
  it('不正な状態を拒否する', async () => { sessionValue = { user: { role: 'bgj', email: 'staff@biogaia.jp' }, expires: '2099' } as Session; expect((await PATCH(request({ status: 'draft', version: 1 }), context)).status).toBe(400); });
  it('公開をDBで確定し、通知処理はレスポンス後へ送る', async () => {
    sessionValue = { user: { role: 'bgj', email: 'staff@biogaia.jp' }, expires: '2099' } as Session;
    const response = await PATCH(request({ status: 'published', version: 2 }), context);
    expect(response.status).toBe(200);
    expect(rpcSpy).toHaveBeenCalledWith('transition_webinar', expect.objectContaining({ p_webinar_id: 'webinar-1', p_expected_version: 2, p_to_status: 'published' }));
    expect(afterCallbacks).toHaveLength(1);
  });
});
