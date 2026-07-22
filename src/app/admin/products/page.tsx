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
};

export default function AdminProductsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isClinicRole = session?.user?.role === 'clinic';
  const ready = sessionStatus !== 'loading';
  const { toast, showToast } = useToast();

  const [products, setProducts] = useSafeState<ProductWithVisibility[]>([]);
  const [loading, setLoading] = useSafeState(true);
  const [error, setError] = useSafeState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchProducts = useCallback(() => {
    fetch('/api/admin/product-settings')
      .then((res) => {
        if (!res.ok) throw new Error('商品一覧の取得に失敗しました');
        return res.json();
      })
      .then((data) => {
        setProducts(data.products ?? []);
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
    if (savingId) return;
    setSavingId(product.id);
    try {
      const res = await fetch('/api/admin/product-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, isVisible: !product.isVisible, clinicPrice: product.clinicPrice }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '更新に失敗しました');
      }
      const { setting } = await res.json();
      // 全件再取得はせず、APIレスポンスの行をローカルstateにマージする（楽観的更新方式）
      setProducts((prev) =>
        prev.map((p) => (p.id === setting.product_id ? { ...p, isVisible: setting.is_visible, clinicPrice: setting.clinic_price } : p)),
      );
      showToast(setting.is_visible ? '患者ポータルに表示します' : '患者ポータルで非表示にしました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSavingId(null);
    }
  };

  const handlePriceSave = async (product: ProductWithVisibility) => {
    if (savingId || !Number.isInteger(product.clinicPrice) || product.clinicPrice < 0) return;
    setSavingId(product.id);
    try {
      const res = await fetch('/api/admin/product-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, isVisible: product.isVisible, clinicPrice: product.clinicPrice }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? '医院価格の更新に失敗しました');
      showToast('医院価格を更新しました。患者ポータルへ反映されます');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
      fetchProducts();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="products" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        {toast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
        )}

        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 shadow-sm">
          <h1 className="text-slate-800 font-bold text-xl">商品管理</h1>
          <p className="text-slate-600 text-sm mt-0.5">患者様ポータルへの表示と医院価格を管理します。仕切値は基準価格×医院契約の仕切値率を1円単位で四捨五入しています。</p>
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
                  <table className="w-full text-sm">
                    <thead className="bg-sky-50/60 border-b border-sky-100">
                      <tr>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">画像</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">商品名</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 hidden sm:table-cell">カテゴリ</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">医院価格</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">仕切値</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">基準価格</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">定期購入</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">患者ポータル表示</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && <LoadingState variant="table-row" colSpan={8} />}
                      {!loading && products.length === 0 && (
                        <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">公開中の商品がまだありません</td></tr>
                      )}
                      {products.map((p) => (
                        <tr key={p.id} className="border-b border-sky-50 last:border-0 hover:bg-sky-50/40">
                          <td className="px-5 py-3"><ProductVisual type={p.image_type} imageUrl={p.image_url} className="h-12 w-12 rounded-lg flex items-center justify-center" /></td>
                          <td className="px-5 py-3">
                            <p className="text-slate-800 font-semibold">{p.name}</p>
                            {p.badge && p.badge_color && (
                              <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${PRODUCT_BADGE_CLASS[p.badge_color]}`}>{p.badge}</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-slate-600 hidden sm:table-cell">{p.category}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-slate-400">¥</span>
                              <input type="number" min={0} max={10000000} value={p.clinicPrice} aria-label={`${p.name}の医院価格`} onChange={(event) => setProducts((current) => current.map((item) => item.id === p.id ? { ...item, clinicPrice: Number(event.target.value) } : item))} className="w-24 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-right text-slate-800" />
                              <button type="button" disabled={savingId !== null} onClick={() => void handlePriceSave(p)} className="text-xs font-semibold text-sky-700 disabled:opacity-40">保存</button>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right text-slate-800 whitespace-nowrap">{p.wholesalePrice === null ? <span className="text-xs text-amber-600">契約未設定</span> : <>¥{p.wholesalePrice.toLocaleString()}<p className="text-[10px] text-slate-400">{p.wholesaleRate}%</p></>}</td>
                          <td className="px-5 py-3 text-right text-slate-800 whitespace-nowrap">¥{p.basePrice.toLocaleString()}</td>
                          <td className="px-5 py-3 text-slate-600 text-xs hidden md:table-cell">{p.subscription_available ? '対応' : '—'}</td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => handleToggle(p)}
                              disabled={savingId !== null}
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
