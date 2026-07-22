// @vitest-environment node
// 医院用ポータル「商品管理」用。公開商品と自院の表示設定のマージ
// （設定行なし=表示のデフォルト表示設計）と、clinic限定のupsertを検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

// resolveScopedCustomerCodeがbgjロール・customerCode未指定時に読むcookie。
// このテストではcookieも無い状態（=undefined）を再現する。
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

const productRows = [
  { id: 'product-1', name: '商品A', category: 'お口と喉のケア', price: 1000, status: '公開' },
  { id: 'product-2', name: '商品B', category: '赤ちゃん・キッズ', price: 2000, status: '公開' },
];
let settingRows: { customer_code: string; product_id: string; is_visible: boolean; clinic_price: number | null; subscription_3_month_price: number | null; subscription_6_month_price: number | null }[] = [];
const upsertSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'products') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => ({
                  limit: async () => ({ data: productRows, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'clinic_product_settings') {
        return {
          select: () => ({
            eq: () => ({
              limit: async () => ({ data: settingRows, error: null }),
            }),
          }),
          upsert: (row: Record<string, unknown>, options: Record<string, unknown>) => {
            upsertSpy(row, options);
            return {
              select: () => ({
                single: async () => ({ data: { ...row, updated_at: '' }, error: null }),
              }),
            };
          },
        };
      }
      if (table === 'clinic_terms') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { customer_code: 'A000001', wholesale_rate: 60 }, error: null }) }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { GET, PATCH } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'clinic', customerCode: 'A000001', patientId: null, ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function getRequest() {
  return new NextRequest('http://localhost/api/admin/product-settings');
}

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/product-settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

describe('GET /api/admin/product-settings', () => {
  beforeEach(() => {
    sessionValue = null;
    settingRows = [];
  });

  it('未認証なら401', async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it('設定行が無い商品はisVisible=true（デフォルト表示）で返す', async () => {
    sessionValue = makeSession();
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products.map((p: { id: string; isVisible: boolean }) => p.isVisible)).toEqual([true, true]);
  });

  it('is_visible=falseの設定行がある商品だけ非表示になる', async () => {
    sessionValue = makeSession();
    settingRows = [{ customer_code: 'A000001', product_id: 'product-2', is_visible: false, clinic_price: 1800, subscription_3_month_price: null, subscription_6_month_price: null }];
    const res = await GET(getRequest());
    const body = await res.json();
    expect(body.products.find((p: { id: string }) => p.id === 'product-1').isVisible).toBe(true);
    expect(body.products.find((p: { id: string }) => p.id === 'product-2').isVisible).toBe(false);
  });

  it('基準価格・仕切値・医院通常価格・期間別価格を返す', async () => {
    sessionValue = makeSession();
    settingRows = [{ customer_code: 'A000001', product_id: 'product-1', is_visible: true, clinic_price: 950, subscription_3_month_price: 900, subscription_6_month_price: 850 }];
    const body = await (await GET(getRequest())).json();
    expect(body.products[0]).toMatchObject({ basePrice: 1000, wholesaleRate: 60, wholesalePrice: 600, clinicPrice: 950, threeMonthPrice: 900, sixMonthPrice: 850 });
  });
});

describe('PATCH /api/admin/product-settings', () => {
  beforeEach(() => {
    sessionValue = null;
    upsertSpy.mockReset();
  });

  it('bgjロールは更新不可（401、クリニックログイン専用）', async () => {
    sessionValue = makeSession({ role: 'bgj', customerCode: null, email: 'staff@biogaia.jp' });
    const res = await PATCH(patchRequest({ productId: 'product-1', isVisible: false, clinicPrice: 900, threeMonthPrice: 850, sixMonthPrice: 800 }));
    expect(res.status).toBe(401);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('productId・isVisibleが不正なら400', async () => {
    sessionValue = makeSession();
    const res = await PATCH(patchRequest({ productId: 'product-1', isVisible: 'no', clinicPrice: 900, threeMonthPrice: 850, sixMonthPrice: 800 }));
    expect(res.status).toBe(400);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('clinicロールなら自院のcustomer_codeに固定してupsertする', async () => {
    sessionValue = makeSession();
    const res = await PATCH(patchRequest({ productId: 'product-1', isVisible: false, clinicPrice: 900, threeMonthPrice: 850, sixMonthPrice: 800 }));
    expect(res.status).toBe(200);
    expect(upsertSpy).toHaveBeenCalledWith(
      {
        customer_code: 'A000001', product_id: 'product-1', is_visible: false, clinic_price: 900,
        subscription_3_month_price: 850, subscription_6_month_price: 800,
      },
      { onConflict: 'customer_code,product_id' },
    );
  });

});
