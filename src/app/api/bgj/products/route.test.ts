// @vitest-environment node
// 商品マスタAPI。BGJ限定の認可と、CHECK制約相当の入力検証（カテゴリ・画像タイプ・
// バッジ色・ステータス・推奨度）がアプリ側でも効くことを確認する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const insertSpy = vi.fn();
const productRow = {
  id: 'product-1',
  name: 'オーラルプロバイオティクス 30日分',
  category: 'お口と喉のケア',
  price: 3980,
  status: '公開',
  sort_order: 10,
};
const listedRows = [productRow];

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'products') throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          order: () => ({
            order: () => ({
              limit: async () => ({ data: listedRows, error: null }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          insertSpy(row);
          return {
            select: () => ({
              single: async () => ({ data: productRow, error: null }),
            }),
          };
        },
      };
    },
  }),
}));

const { GET, POST } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/bgj/products', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

const validBody = { name: 'テスト商品', category: 'お口と喉のケア', price: 1000 };

describe('GET /api/bgj/products', () => {
  beforeEach(() => {
    sessionValue = null;
  });

  it('未認証なら401', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('clinicロールは取得不可（401。クリニックは/api/admin/product-settingsを使う）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('bgjロールなら一覧を取得できる', async () => {
    sessionValue = makeSession();
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toEqual(listedRows);
  });
});

describe('POST /api/bgj/products', () => {
  beforeEach(() => {
    sessionValue = null;
    insertSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('商品名が無ければ400', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ ...validBody, name: '' }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('カテゴリが候補外なら400', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ ...validBody, category: '雑貨' }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('バッジ色が候補外なら400', async () => {
    sessionValue = makeSession();
    const res = await POST(makeRequest({ ...validBody, badgeColor: 'purple' }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('bgjロールなら作成でき、snake_caseの行に変換される（未入力の任意項目はnull）', async () => {
    sessionValue = makeSession();
    const res = await POST(
      makeRequest({
        ...validBody,
        imageType: 'oral',
        badge: '新着',
        badgeColor: 'rose',
        subscriptionAvailable: true,
        workingPoint: '虫歯を予防',
        recommendationLevel: '◎',
        status: '公開',
        sortOrder: 10,
      }),
    );
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'テスト商品',
        category: 'お口と喉のケア',
        price: 1000,
        image_type: 'oral',
        badge: '新着',
        badge_color: 'rose',
        subscription_available: true,
        working_point: '虫歯を予防',
        recommendation_level: '◎',
        status: '公開',
        sort_order: 10,
        volume: null,
        doctor_comment: null,
      }),
    );
  });
});
