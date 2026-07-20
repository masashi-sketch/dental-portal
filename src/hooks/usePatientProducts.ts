'use client';

import { useEffect } from 'react';
import type { Product } from '@/lib/supabase/types';
import { useSafeState } from './useSafeState';

let productsPromise: Promise<Product[]> | null = null;

function loadProducts() {
  if (!productsPromise) {
    productsPromise = fetch('/api/patient-portal/products')
      .then(async (response) => {
        if (!response.ok) throw new Error('商品情報を取得できませんでした');
        const data = await response.json();
        return (data.products ?? []) as Product[];
      })
      .catch((error) => {
        productsPromise = null;
        throw error;
      });
  }
  return productsPromise;
}
// 患者ポータル内の画面遷移で同じ商品一覧を何度も取得しないため、Promiseを共有する。
export function usePatientProducts() {
  const [products, setProducts] = useSafeState<Product[]>([]);
  const [loaded, setLoaded] = useSafeState(false);
  const [error, setError] = useSafeState<string | null>(null);

  useEffect(() => {
    loadProducts()
      .then(setProducts)
      .catch(() => setError('商品情報を読み込めませんでした。時間をおいて再度お試しください。'))
      .finally(() => setLoaded(true));
  }, [setError, setLoaded, setProducts]);

  return { products, loaded, error };
}
