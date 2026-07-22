// @vitest-environment node
// 患者ポータル向け商品一覧。医院が非表示にした商品の除外（設定行なし=表示）と、
// スコープ未解決時の空配列を検証する。statusフィルタはSupabaseクエリ（.eq）に
// 委ねているため、ここでは呼び出しの組み立てではなく除外ロジックを確認する。
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: async () => null,
}));

let customerCodeValue: string | null = 'A000001';
vi.mock('@/lib/auth/patientScope', () => ({
  resolveEffectiveCustomerCode: async () => customerCodeValue,
}));

const productRows = [
  { id: 'product-1', name: '商品A', category: 'お口と喉のケア', price: 1000, status: '公開' },
  { id: 'product-2', name: '商品B', category: '赤ちゃん・キッズ', price: 2000, status: '公開' },
];
let settingRows: { product_id: string; is_visible: boolean; clinic_price: number | null; subscription_3_month_price: number | null; subscription_6_month_price: number | null }[] = [];

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
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const { GET } = await import('./route');

describe('GET /api/patient-portal/products', () => {
  beforeEach(() => {
    customerCodeValue = 'A000001';
    settingRows = [];
  });

  it('スコープが解決できない場合は空配列を返す（エラーにしない）', async () => {
    customerCodeValue = null;
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ products: [] });
  });

  it('非表示設定が無ければ公開商品を全件返す', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.products.map((p: { id: string }) => p.id)).toEqual(['product-1', 'product-2']);
  });

  it('医院が非表示にした商品は除外して返す', async () => {
    settingRows = [{ product_id: 'product-2', is_visible: false, clinic_price: null, subscription_3_month_price: null, subscription_6_month_price: null }];
    const res = await GET();
    const body = await res.json();
    expect(body.products.map((p: { id: string }) => p.id)).toEqual(['product-1']);
  });

  it('医院通常価格と期間別価格を患者向けに返す', async () => {
    settingRows = [{ product_id: 'product-1', is_visible: true, clinic_price: 850, subscription_3_month_price: 800, subscription_6_month_price: 750 }];
    const body = await (await GET()).json();
    expect(body.products.find((p: { id: string }) => p.id === 'product-1')).toMatchObject({ price: 850, clinicPrice: 850, threeMonthPrice: 800, sixMonthPrice: 750 });
  });
});
