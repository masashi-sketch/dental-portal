// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

const updateSpy = vi.fn();
const deleteSpy = vi.fn();
const updatedRow = {
  id: 'product-1',
  name: 'オーラルプロバイオティクス 30日分',
  product_code: null,
  category: 'お口と喉のケア',
  price: 3980,
  status: '公開',
};
let updateError: { code: string; message: string } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table !== 'products') throw new Error(`unexpected table: ${table}`);
      return {
        update: (row: Record<string, unknown>) => {
          updateSpy(row);
          return {
            eq: () => ({
              select: () => ({
                single: async () => (updateError ? { data: null, error: updateError } : { data: updatedRow, error: null }),
              }),
            }),
          };
        },
        delete: () => ({
          eq: (...args: unknown[]) => {
            deleteSpy(...args);
            return Promise.resolve({ error: null });
          },
        }),
      };
    },
  }),
}));

const { PATCH, DELETE } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePatchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/bgj/products/product-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0];
}

const validBody = { name: 'テスト商品', category: 'お口と喉のケア', price: 1000 };

describe('PATCH /api/bgj/products/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    updateSpy.mockReset();
    updateError = null;
  });

  it('未認証なら401', async () => {
    const res = await PATCH(makePatchRequest(validBody), makeParams('product-1'));
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('clinicロールは編集不可（401）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await PATCH(makePatchRequest(validBody), makeParams('product-1'));
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('ステータスが候補外なら400', async () => {
    sessionValue = makeSession();
    const res = await PATCH(makePatchRequest({ ...validBody, status: '廃止' }), makeParams('product-1'));
    expect(res.status).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('bgjロールなら更新できる', async () => {
    sessionValue = makeSession();
    const res = await PATCH(makePatchRequest({ ...validBody, status: '公開' }), makeParams('product-1'));
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'テスト商品', status: '公開' }),
    );
  });

  it('商品コードが他商品と重複している場合は409', async () => {
    sessionValue = makeSession();
    updateError = { code: '23505', message: 'duplicate key value violates unique constraint "products_product_code_key"' };
    const res = await PATCH(makePatchRequest({ ...validBody, productCode: 'BG-0001' }), makeParams('product-1'));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('この商品コードは既に使用されています。');
  });
});

describe('DELETE /api/bgj/products/[id]', () => {
  beforeEach(() => {
    sessionValue = null;
    deleteSpy.mockReset();
  });

  it('未認証なら401', async () => {
    const res = await DELETE(new Request('http://localhost/api/bgj/products/product-1', { method: 'DELETE' }) as unknown as Parameters<typeof DELETE>[0], makeParams('product-1'));
    expect(res.status).toBe(401);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('bgjロールなら削除できる', async () => {
    sessionValue = makeSession();
    const res = await DELETE(new Request('http://localhost/api/bgj/products/product-1', { method: 'DELETE' }) as unknown as Parameters<typeof DELETE>[0], makeParams('product-1'));
    expect(res.status).toBe(200);
    expect(deleteSpy).toHaveBeenCalled();
  });
});
