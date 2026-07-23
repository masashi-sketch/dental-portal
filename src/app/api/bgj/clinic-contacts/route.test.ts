// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireBgjSessionMock = vi.fn();
vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { role: 'bgj', email: 'staff@biogaia.jp' } })) }));
vi.mock('@/lib/auth/clinicScope', () => ({ requireBgjSession: (...args: unknown[]) => requireBgjSessionMock(...args) }));

const rows = [{ id: 'contact-1', customer_code: 'A000001', name: '受付 太郎' }];
const selectSpy = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: (columns: string) => {
        selectSpy(columns);
        const query = {
          is: () => query,
          order: () => query,
          limit: async () => ({ data: rows, error: null }),
        };
        return query;
      },
    }),
  }),
}));

const { GET } = await import('./route');

describe('GET /api/bgj/clinic-contacts', () => {
  beforeEach(() => { requireBgjSessionMock.mockReset(); selectSpy.mockClear(); });

  it('BGJ以外は401', async () => {
    requireBgjSessionMock.mockReturnValue(false);
    expect((await GET()).status).toBe(401);
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('担当者・得意先・通知設定・ログイン状態をまとめて返す', async () => {
    requireBgjSessionMock.mockReturnValue(true);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contacts: rows });
    expect(selectSpy.mock.calls[0][0]).toContain('clinic:clinics!customer_code');
    expect(selectSpy.mock.calls[0][0]).toContain('preferences:clinic_contact_notification_preferences');
    expect(selectSpy.mock.calls[0][0]).toContain('clinic_user:clinic_users!clinic_user_id');
  });
});
