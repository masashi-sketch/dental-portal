// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({ auth: async () => sessionValue }));
const rpcSpy = vi.fn();
const webinarRows = [{ id: 'webinar-1', title: 'テスト' }];
const clinicRows = [{ customer_code: 'A000001', name: '中央歯科' }];
vi.mock('@/lib/supabase/server', () => ({ getSupabaseServerClient: () => ({
  from: (table: string) => ({ select: () => ({ order: () => ({ limit: async () => ({ data: table === 'webinars' ? webinarRows : clinicRows, error: null }) }) }) }),
  rpc: (name: string, args: unknown) => { rpcSpy(name, args); return Promise.resolve({ data: 'webinar-1', error: null }); },
}) }));

const { GET, POST } = await import('./route');
const bgjSession = { user: { role: 'bgj', email: 'staff@biogaia.jp' }, expires: '2099-01-01' } as Session;
const validBody = { title: 'テスト', provider: 'zoom', startsAt: '2026-08-01T01:00:00Z', endsAt: '2026-08-01T02:00:00Z', timezone: 'Asia/Tokyo', joinUrl: 'https://us02web.zoom.us/j/123', customerCodes: ['A000001'] };

describe('/api/bgj/webinars', () => {
  beforeEach(() => { sessionValue = null; rpcSpy.mockClear(); });
  it('BGJ以外を拒否する', async () => { expect((await GET()).status).toBe(401); });
  it('一覧と医院候補を同時に返す', async () => { sessionValue = bgjSession; expect(await (await GET()).json()).toEqual({ webinars: webinarRows, clinics: clinicRows }); });
  it('入力検証後に下書きをRPCで保存する', async () => {
    sessionValue = bgjSession;
    const response = await POST(new Request('http://localhost/api/bgj/webinars', { method: 'POST', body: JSON.stringify(validBody) }) as never);
    expect(response.status).toBe(201);
    expect(rpcSpy).toHaveBeenCalledWith('save_webinar_draft', expect.objectContaining({ p_provider: 'zoom', p_customer_codes: ['A000001'], p_actor_email: 'staff@biogaia.jp' }));
  });
  it('配信サービスとURLが不一致なら400', async () => { sessionValue = bgjSession; const response = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ ...validBody, joinUrl: 'https://meet.google.com/abc' }) }) as never); expect(response.status).toBe(400); expect(rpcSpy).not.toHaveBeenCalled(); });
});

