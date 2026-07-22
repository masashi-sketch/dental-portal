'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingState from '@/components/ui/LoadingState';
import ShippingAddressFields from '@/components/orders/ShippingAddressFields';
import {
  EMPTY_SHIPPING_ADDRESS,
  formatShippingAddress,
  normalizeShippingAddress,
  validateShippingAddress,
  type ShippingAddressInput,
} from '@/lib/shippingAddress';
import type { FulfillmentMethod } from '@/lib/supabase/types';

type ClinicOption = { customer_code: string; name: string };
type PatientOption = { id: string; customer_code: string; patient_no: string; name: string };
type ProductOption = { id: string; name: string; product_code: string; price: number; unit: string | null };
type OrderLineInput = { productId: string; quantity: number };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
};

function newIdempotencyKey() {
  return crypto.randomUUID();
}

export default function BgjCreateOrderSheet({ open, onClose, onCreated }: Props) {
  if (!open) return null;
  return <BgjCreateOrderSheetContent onClose={onClose} onCreated={onCreated} />;
}

function BgjCreateOrderSheetContent({ onClose, onCreated }: Omit<Props, 'open'>) {
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [clinicQuery, setClinicQuery] = useState('');
  const [selectedClinic, setSelectedClinic] = useState<ClinicOption | null>(null);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [patientId, setPatientId] = useState('');
  const [lines, setLines] = useState<OrderLineInput[]>([]);
  const [productToAdd, setProductToAdd] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('pickup');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddressInput>({ ...EMPTY_SHIPPING_ADDRESS });
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const loadClinics = useCallback(async (query: string) => {
    setLoadingClinics(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      const response = await fetch(`/api/bgj/orders/create-options${params.size ? `?${params}` : ''}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '医院を取得できませんでした。');
      setClinics(body.clinics ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '医院を取得できませんでした。');
    } finally {
      setLoadingClinics(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadClinics(''); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadClinics]);

  const isDirty = Boolean(selectedClinic || patientId || lines.length || fulfillmentMethod === 'delivery');
  const requestClose = useCallback(() => {
    if (saving) return;
    if (isDirty && !window.confirm('入力中の受注内容を破棄して閉じますか？')) return;
    onClose();
  }, [isDirty, onClose, saving]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [requestClose]);

  const chooseClinic = async (clinic: ClinicOption) => {
    setSelectedClinic(clinic);
    setPatientId('');
    setLines([]);
    setProductToAdd('');
    setFulfillmentMethod('pickup');
    setShippingAddress({ ...EMPTY_SHIPPING_ADDRESS });
    setReviewing(false);
    setLoadingOptions(true);
    setError(null);
    try {
      const response = await fetch(`/api/bgj/orders/create-options?customerCode=${encodeURIComponent(clinic.customer_code)}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '患者・商品を取得できませんでした。');
      setPatients(body.patients ?? []);
      setProducts(body.products ?? []);
    } catch (loadError) {
      setSelectedClinic(null);
      setError(loadError instanceof Error ? loadError.message : '患者・商品を取得できませんでした。');
    } finally {
      setLoadingOptions(false);
    }
  };

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const selectedPatient = patients.find((patient) => patient.id === patientId) ?? null;
  const totalAmount = lines.reduce((sum, line) => sum + (productMap.get(line.productId)?.price ?? 0) * line.quantity, 0);
  const availableProducts = products.filter((product) => !lines.some((line) => line.productId === product.id));
  const shippingError = fulfillmentMethod === 'delivery' ? validateShippingAddress(shippingAddress) : null;

  const addProduct = () => {
    if (!productToAdd || lines.length >= 50) return;
    setLines((current) => [...current, { productId: productToAdd, quantity: 1 }]);
    setProductToAdd('');
  };

  const createOrder = async () => {
    if (!selectedClinic || !patientId || lines.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/bgj/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerCode: selectedClinic.customer_code,
          patientId,
          items: lines,
          fulfillmentMethod,
          shippingAddress: fulfillmentMethod === 'delivery' ? normalizeShippingAddress(shippingAddress) : null,
          idempotencyKey,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '受注を登録できませんでした。');
      setIdempotencyKey(newIdempotencyKey());
      await onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '受注を登録できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="create-order-title">
      <button type="button" aria-label="新規受注を閉じる" onClick={requestClose} className="absolute inset-0 bg-slate-950/45" />
      <section className="absolute inset-0 flex min-h-0 flex-col bg-white shadow-2xl sm:left-auto sm:w-[min(680px,92vw)]">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold tracking-widest text-violet-500">BGJ代理登録</p>
            <h2 id="create-order-title" className="mt-1 text-xl font-bold text-slate-800">新規受注</h2>
          </div>
          <button type="button" onClick={requestClose} disabled={saving} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">× 閉じる</button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {!selectedClinic && (
            <section>
              <h3 className="font-bold text-slate-800">1. 医院を選択</h3>
              <form onSubmit={(event) => { event.preventDefault(); void loadClinics(clinicQuery); }} className="mt-3 flex gap-2">
                <input value={clinicQuery} onChange={(event) => setClinicQuery(event.target.value)} maxLength={100} placeholder="得意先コードまたは医院名" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800" />
                <button type="submit" disabled={loadingClinics} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">検索</button>
              </form>
              {loadingClinics ? <div className="py-16"><LoadingState /></div> : (
                <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                  {clinics.map((clinic) => (
                    <button key={clinic.customer_code} type="button" onClick={() => void chooseClinic(clinic)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-violet-50">
                      <span className="font-semibold text-slate-800">{clinic.name}</span>
                      <span className="font-mono text-xs text-slate-500">{clinic.customer_code}</span>
                    </button>
                  ))}
                  {clinics.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-400">該当する医院はありません</p>}
                </div>
              )}
            </section>
          )}

          {selectedClinic && loadingOptions && <div className="py-20"><LoadingState /></div>}

          {selectedClinic && !loadingOptions && !reviewing && (
            <div className="space-y-6">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-800">1. 医院</h3>
                  <button type="button" onClick={() => setSelectedClinic(null)} className="text-sm font-semibold text-violet-700 hover:underline">変更</button>
                </div>
                <div className="mt-2 rounded-xl bg-violet-50 px-4 py-3"><p className="font-semibold text-slate-800">{selectedClinic.name}</p><p className="font-mono text-xs text-slate-500">{selectedClinic.customer_code}</p></div>
              </section>

              <section>
                <h3 className="font-bold text-slate-800">2. 患者を選択</h3>
                <select aria-label="患者" value={patientId} onChange={(event) => setPatientId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800">
                  <option value="">選択してください</option>
                  {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}（{patient.patient_no}）</option>)}
                </select>
                {patients.length === 0 && <p className="mt-2 text-sm text-amber-700">この医院に有効な患者が登録されていません。</p>}
              </section>

              <section>
                <h3 className="font-bold text-slate-800">3. 商品と数量</h3>
                <div className="mt-2 flex gap-2">
                  <select aria-label="追加する商品" value={productToAdd} onChange={(event) => setProductToAdd(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800">
                    <option value="">商品を選択</option>
                    {availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name}（¥{product.price.toLocaleString()}）</option>)}
                  </select>
                  <button type="button" onClick={addProduct} disabled={!productToAdd} className="rounded-xl border border-violet-300 px-4 py-2 text-sm font-semibold text-violet-700 disabled:opacity-40">追加</button>
                </div>
                <div className="mt-3 space-y-2">
                  {lines.map((line) => {
                    const product = productMap.get(line.productId);
                    return (
                      <div key={line.productId} className="grid grid-cols-[1fr_90px_auto] items-center gap-2 rounded-xl bg-slate-50 p-3">
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{product?.name}</p><p className="text-xs text-slate-500">¥{product?.price.toLocaleString()} / {product?.unit ?? '個'}</p></div>
                        <input aria-label={`${product?.name ?? '商品'}の数量`} type="number" min={1} max={100} value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.productId === line.productId ? { ...item, quantity: Math.max(1, Math.min(100, Number(event.target.value) || 1)) } : item))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-right text-sm" />
                        <button type="button" aria-label={`${product?.name ?? '商品'}を削除`} onClick={() => setLines((current) => current.filter((item) => item.productId !== line.productId))} className="rounded-lg px-2 py-2 text-sm font-semibold text-red-600">削除</button>
                      </div>
                    );
                  })}
                  {lines.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">商品を追加してください</p>}
                </div>
              </section>

              <section>
                <h3 className="font-bold text-slate-800">4. 受け取り方法</h3>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setFulfillmentMethod('pickup')} className={`rounded-xl border-2 px-4 py-4 text-left ${fulfillmentMethod === 'pickup' ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white'}`}>
                    <p className="font-semibold text-slate-800">医院で受け取り</p><p className="mt-1 text-xs text-slate-500">選択した医院でお渡しします</p>
                  </button>
                  <button type="button" onClick={() => setFulfillmentMethod('delivery')} className={`rounded-xl border-2 px-4 py-4 text-left ${fulfillmentMethod === 'delivery' ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white'}`}>
                    <p className="font-semibold text-slate-800">ご自宅へお届け</p><p className="mt-1 text-xs text-slate-500">配送先住所への発送として登録します</p>
                  </button>
                </div>
                {fulfillmentMethod === 'delivery' && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <ShippingAddressFields value={shippingAddress} onChange={setShippingAddress} color="violet" />
                    {shippingError && <p className="mt-3 text-xs text-amber-700">{shippingError}</p>}
                  </div>
                )}
              </section>
            </div>
          )}

          {selectedClinic && !loadingOptions && reviewing && (
            <section>
              <h3 className="text-lg font-bold text-slate-800">受注内容の確認</h3>
              <dl className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                <div className="grid grid-cols-[90px_1fr] gap-3 py-3"><dt className="text-sm text-slate-500">医院</dt><dd className="text-sm font-semibold text-slate-800">{selectedClinic.name}（{selectedClinic.customer_code}）</dd></div>
                <div className="grid grid-cols-[90px_1fr] gap-3 py-3"><dt className="text-sm text-slate-500">患者</dt><dd className="text-sm font-semibold text-slate-800">{selectedPatient?.name}（{selectedPatient?.patient_no}）</dd></div>
                <div className="grid grid-cols-[90px_1fr] gap-3 py-3"><dt className="text-sm text-slate-500">受け取り</dt><dd className="text-sm font-semibold text-slate-800">{fulfillmentMethod === 'pickup' ? '医院で受け取り' : 'ご自宅へお届け'}</dd></div>
                {fulfillmentMethod === 'delivery' && <div className="grid grid-cols-[90px_1fr] gap-3 py-3"><dt className="text-sm text-slate-500">配送先</dt><dd className="text-sm text-slate-800"><p>{formatShippingAddress(shippingAddress)}</p><p className="mt-1">{shippingAddress.recipientName}／{shippingAddress.phone}</p></dd></div>}
                <div className="grid grid-cols-[90px_1fr] gap-3 py-3"><dt className="text-sm text-slate-500">商品</dt><dd className="space-y-2">{lines.map((line) => <div key={line.productId} className="flex justify-between gap-3 text-sm"><span>{productMap.get(line.productId)?.name} × {line.quantity}</span><span className="font-mono">¥{((productMap.get(line.productId)?.price ?? 0) * line.quantity).toLocaleString()}</span></div>)}</dd></div>
              </dl>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-4"><span className="font-semibold text-violet-800">合計金額</span><strong className="font-mono text-2xl text-violet-800">¥{totalAmount.toLocaleString()}</strong></div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">価格は確定時に商品マスタから再取得します。登録後は注文時点の価格として保持されます。</p>
            </section>
          )}
        </div>

        {selectedClinic && !loadingOptions && (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
            <button type="button" onClick={reviewing ? () => setReviewing(false) : requestClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50">{reviewing ? '入力へ戻る' : 'キャンセル'}</button>
            {reviewing ? (
              <button type="button" onClick={() => void createOrder()} disabled={saving} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? '登録中…' : '受注を確定'}</button>
            ) : (
              <button type="button" onClick={() => setReviewing(true)} disabled={!patientId || lines.length === 0 || Boolean(shippingError)} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">確認へ</button>
            )}
          </footer>
        )}
      </section>
    </div>
  );
}
