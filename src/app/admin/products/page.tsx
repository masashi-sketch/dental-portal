'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AdminSidebar from '../components/AdminSidebar';
import { useToast } from '@/hooks/useToast';
import { useSafeState } from '@/hooks/useSafeState';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import ProductVisual from '@/components/ProductVisual';
import { PRODUCT_BADGE_CLASS } from '@/lib/productDisplay';
import type { Product } from '@/lib/supabase/types';

// 商品マスタの実体はBGJポータル（/bgj/master/products）が管理する。
// この画面は「BGJが公開した商品のうち、自院の患者ポータルに表示する商品を選ぶ」
// 表示設定専用（設定行が無い商品はデフォルト表示）。
type ProductWithVisibility = Product & {
  isVisible: boolean;
  basePrice: number;
  wholesaleRate: number | null;
  wholesalePrice: number | null;
  clinicPrice: number;
  threeMonthPrice: number;
  sixMonthPrice: number;
};
type EditablePriceField = 'clinicPrice' | 'threeMonthPrice' | 'sixMonthPrice';

export default function AdminProductsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isClinicRole = session?.user?.role === 'clinic';
  const ready = sessionStatus !== 'loading';
  const { toast, showToast } = useToast();

  const [products, setProducts] = useSafeState<ProductWithVisibility[]>([]);
  const [loading, setLoading] = useSafeState(true);
  const [error, setError] = useSafeState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());

  const fetchProducts = useCallback(() => {
    fetch('/api/admin/product-settings')
      .then((res) => {
        if (!res.ok) throw new Error('商品一覧の取得に失敗しました');
        return res.json();
      })
      .then((data) => {
        setProducts(data.products ?? []);
        setDirtyIds(new Set());
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'エラーが発生しました');
      })
      .finally(() => setLoading(false));
  }, [setProducts, setError, setLoading]);

  useEffect(() => {
    if (!ready || !isClinicRole) return;
    fetchProducts();
  }, [ready, isClinicRole, fetchProducts]);

  const handleToggle = async (product: ProductWithVisibility) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/product-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          isVisible: !product.isVisible,
          clinicPrice: product.clinicPrice,
          threeMonthPrice: product.threeMonthPrice,
          sixMonthPrice: product.sixMonthPrice,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '更新に失敗しました');
      }
      const { setting } = await res.json();
      // 全件再取得はせず、APIレスポンスの行をローカルstateにマージする（楽観的更新方式）
      setProducts((prev) =>
        prev.map((p) => (p.id === setting.product_id ? { ...p, isVisible: setting.is_visible } : p)),
      );
      setDirtyIds((current) => {
        const next = new Set(current);
        next.delete(product.id);
        return next;
      });
      showToast(setting.is_visible ? '患者ポータルに表示します' : '患者ポータルで非表示にしました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const updatePrice = (productId: string, field: EditablePriceField, value: number) => {
    setProducts((current) => current.map((item) => item.id === productId ? { ...item, [field]: value } : item));
    setDirtyIds((current) => new Set(current).add(productId));
  };

  const handlePriceSave = async () => {
    const targets = products.filter((product) => dirtyIds.has(product.id));
    if (saving || targets.length === 0 || targets.some((product) =>
      ![product.clinicPrice, product.threeMonthPrice, product.sixMonthPrice]
        .every((price) => Number.isInteger(price) && price >= 0 && price <= 10_000_000))) return;
    setSaving(true);
    try {
      await Promise.all(targets.map(async (product) => {
        const res = await fetch('/api/admin/product-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            isVisible: product.isVisible,
            clinicPrice: product.clinicPrice,
            threeMonthPrice: product.threeMonthPrice,
            sixMonthPrice: product.sixMonthPrice,
          }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `${product.name}の価格を更新できませんでした`);
      }));
      setDirtyIds(new Set());
      showToast(`${targets.length}件の価格を更新しました`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
      fetchProducts();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="products" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        {toast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
        )}

        <header className="flex items-center justify-between gap-4 bg-white border-b border-sky-100 px-4 sm:px-6 py-4 shadow-sm">
          <div className="min-w-0">
            <h1 className="text-slate-800 font-bold text-xl">商品管理</h1>
            <p className="text-slate-600 text-sm mt-0.5">患者様ポータルへの表示、医院通常価格、3ヶ月・6ヶ月の定期購入価格を管理します。</p>
          </div>
          {isClinicRole && <button type="button" onClick={() => void handlePriceSave()} disabled={loading || saving || dirtyIds.size === 0} className="shrink-0 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">{saving ? '保存中…' : `変更を保存${dirtyIds.size > 0 ? `（${dirtyIds.size}件）` : ''}`}</button>}
        </header>

        <main className="flex-1 p-5 sm:p-6">
          {!ready && <LoadingState />}

          {ready && !isClinicRole && (
            <Card theme="sky" className="p-5 sm:p-6 shadow-sm max-w-2xl">
              <p className="text-sm font-bold text-slate-700 mb-1">この画面はクリニックログイン専用です</p>
              <p className="text-slate-500 text-sm mb-4">
                商品マスタの登録・編集は、BGJポータルの「マスタ &gt; 商品マスタ」から行えます。
              </p>
              <Link
                href="/bgj/master/products"
                className="inline-block bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                BGJポータルの商品マスタへ
              </Link>
            </Card>
          )}

          {ready && isClinicRole && (
            <>
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              <Card theme="sky" className="shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1152px] table-fixed text-sm">
                    <colgroup>
                      <col className="w-[72px]" /><col className="w-[200px]" /><col className="w-[120px]" />
                      <col className="w-[130px]" /><col className="w-[120px]" /><col className="w-[120px]" />
                      <col className="w-[100px]" /><col className="w-[95px]" /><col className="w-[70px]" /><col className="w-[125px]" />
                    </colgroup>
                    <thead className="bg-sky-50/60 border-b border-sky-100">
                      <tr>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">画像</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">商品名</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">カテゴリ</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">医院通常価格</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">3ヶ月価格</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">6ヶ月価格</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">仕切値<span className="mt-0.5 block text-[10px] font-normal text-slate-400">現在 {products[0]?.wholesaleRate ?? '未設定'}{products[0]?.wholesaleRate === null || products.length === 0 ? '' : '%'}</span></th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">基準価格</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">定期購入</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">患者ポータル表示</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && <LoadingState variant="table-row" colSpan={10} />}
                      {!loading && products.length === 0 && (
                        <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-400">公開中の商品がまだありません</td></tr>
                      )}
                      {products.map((p) => (
                        <tr key={p.id} className="h-[72px] border-b border-sky-50 last:border-0 hover:bg-sky-50/40">
                          <td className="px-3 py-3"><ProductVisual type={p.image_type} imageUrl={p.image_url} className="h-12 w-12 rounded-lg flex items-center justify-center" /></td>
                          <td className="px-3 py-3"><div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                            <p title={p.name} className="min-w-0 truncate text-slate-800 font-semibold">{p.name}</p>
                            {p.badge && p.badge_color && (
                              <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${PRODUCT_BADGE_CLASS[p.badge_color]}`}>{p.badge}</span>
                            )}
                          </div></td>
                          <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{p.category}</td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                              <span className="text-slate-400">¥</span>
                              <input type="number" min={0} max={10000000} value={p.clinicPrice} aria-label={`${p.name}の医院通常価格`} onChange={(event) => updatePrice(p.id, 'clinicPrice', Number(event.target.value))} className="w-20 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-right text-slate-800" />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right"><div className="inline-flex items-center gap-1 whitespace-nowrap"><span className="text-slate-400">¥</span><input type="number" min={0} max={10000000} value={p.threeMonthPrice} aria-label={`${p.name}の3ヶ月価格`} onChange={(event) => updatePrice(p.id, 'threeMonthPrice', Number(event.target.value))} className="w-20 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-right text-slate-800" /></div></td>
                          <td className="px-3 py-3 text-right"><div className="inline-flex items-center gap-1 whitespace-nowrap"><span className="text-slate-400">¥</span><input type="number" min={0} max={10000000} value={p.sixMonthPrice} aria-label={`${p.name}の6ヶ月価格`} onChange={(event) => updatePrice(p.id, 'sixMonthPrice', Number(event.target.value))} className="w-20 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-right text-slate-800" /></div></td>
                          <td className="px-3 py-3 text-right text-slate-800 whitespace-nowrap">{p.wholesalePrice === null ? <span className="text-xs text-amber-600">契約未設定</span> : <>¥{p.wholesalePrice.toLocaleString()}</>}</td>
                          <td className="px-3 py-3 text-right text-slate-800 whitespace-nowrap">¥{p.basePrice.toLocaleString()}</td>
                          <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">{p.subscription_available ? '対応' : '—'}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center whitespace-nowrap">
                            <button
                              onClick={() => handleToggle(p)}
                              disabled={saving}
                              aria-label={`${p.name}の表示切替`}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                                p.isVisible ? 'bg-sky-500' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  p.isVisible ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className="ml-2 text-xs text-slate-500 align-middle">{p.isVisible ? '表示' : '非表示'}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
