// @vitest-environment node
// 患者ポータルのホーム画面向け公開readエンドポイント。下書き状態のお知らせが
// 絶対に含まれないことを検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: async () => null,
}));

const resolveEffectiveCustomerCodeMock = vi.fn(async (): Promise<string | null> => 'A000001');
vi.mock('@/lib/auth/patientScope', () => ({
  resolveEffectiveCustomerCode: (...args: unknown[]) => resolveEffectiveCustomerCodeMock(...(args as [])),
}));

let statusFilterUsed: string | null = null;
const rows = [
  { id: 'ann-1', customer_code: 'A000001', announcement_date: '2026-07-02', tag: '重要', text: '公開中のお知らせ', status: '公開', created_at: '', updated_at: '' },
];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'clinic_announcements') throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: (col: string, value: string) => {
              if (col === 'status') statusFilterUsed = value;
              return {
                order: () => ({
                  limit: async () => ({ data: rows, error: null }),
                }),
              };
            },
          }),
        }),
      };
    },
  }),
}));

const { GET } = await import('./route');

describe('GET /api/patient-portal/announcements', () => {
  beforeEach(() => {
    statusFilterUsed = null;
    resolveEffectiveCustomerCodeMock.mockClear();
    resolveEffectiveCustomerCodeMock.mockResolvedValue('A000001');
  });

  it('customerCodeが解決できなければ空配列を返す', async () => {
    resolveEffectiveCustomerCodeMock.mockResolvedValue(null);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.announcements).toEqual([]);
  });

  it('公開ステータスのみに絞り込んで取得する', async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.announcements).toEqual(rows);
    expect(statusFilterUsed).toBe('公開');
  });
});
