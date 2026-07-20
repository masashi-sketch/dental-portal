// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

// unstable_cacheはNext.jsのリクエストライフサイクル（AsyncLocalStorage）に依存しており、
// vitestのnode環境で素のまま呼ぶとエラーになる。ここでは素通しの関数に差し替える
// （キャッシュ自体の検証はスコープ外、DBクエリ結果が正しく返るかだけを見る）。
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

const stages = [{ code: 1, label: 'ステージI', name: '軽度', description: '', sort_order: 1 }];
const grades = [{ code: 'A', label: 'グレードA', name: '緩徐進行', description: '', sort_order: 1 }];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => ({
      select: () => ({
        order: () => ({
          limit: async () => ({
            data: table === 'periodontal_stages' ? stages : grades,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

const { GET } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

describe('GET /api/periodontal/master', () => {
  beforeEach(() => {
    sessionValue = null;
  });

  it('未認証なら401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('ステージ・グレードのマスタを返す', async () => {
    sessionValue = makeSession();
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ stages, grades });
  });
});
