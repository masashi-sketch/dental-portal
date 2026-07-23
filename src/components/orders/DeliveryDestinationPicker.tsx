'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ShippingAddressFields from './ShippingAddressFields';
import { useSafeState } from '@/hooks/useSafeState';
import { EMPTY_SHIPPING_ADDRESS, formatShippingAddress, validateShippingAddress, type ShippingAddressInput } from '@/lib/shippingAddress';
import type { DeliveryDestination } from '@/lib/supabase/types';

type Props = {
  apiBase: string;
  customerCode?: string;
  patientId?: string;
  ownerLabel: string;
  selectedId: string;
  onSelect: (id: string, destination?: DeliveryDestination) => void;
  color?: 'sky' | 'violet' | 'indigo';
  onError?: (message: string) => void;
  readOnly?: boolean;
};

export default function DeliveryDestinationPicker({
  apiBase,
  customerCode,
  patientId,
  ownerLabel,
  selectedId,
  onSelect,
  color = 'violet',
  onError,
  readOnly = false,
}: Props) {
  const [destinations, setDestinations] = useSafeState<DeliveryDestination[]>([]);
  const [loading, setLoading] = useSafeState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [address, setAddress] = useState<ShippingAddressInput>({ ...EMPTY_SHIPPING_ADDRESS });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (customerCode) params.set('customerCode', customerCode);
    if (patientId) params.set('patientId', patientId);
    return params.toString();
  }, [customerCode, patientId]);

  const load = useCallback(async (preferredId?: string) => {
    try {
      const response = await fetch(`${apiBase}${query ? `?${query}` : ''}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '送り先を取得できませんでした。');
      const next = (body?.destinations ?? []) as DeliveryDestination[];
      setDestinations(next);
      const preferred = next.find((item) => item.id === preferredId);
      if (preferred) {
        onSelect(preferred.id, preferred);
      } else if (!next.some((item) => item.id === selectedId)) {
        const fallback = next.find((item) => item.is_default) ?? next[0];
        onSelect(fallback?.id ?? '', fallback);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '送り先を取得できませんでした。');
      setDestinations([]);
      onSelect('');
    } finally {
      setLoading(false);
    }
  }, [apiBase, onError, onSelect, query, selectedId, setDestinations, setLoading]);

  useEffect(() => { void load(); }, [load]);

  const createDestination = async () => {
    const addressError = validateShippingAddress(address);
    if (!label.trim() || addressError || saving) {
      onError?.(addressError ?? '送り先名を入力してください。');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerCode, patientId, label: label.trim(), address, isDefault }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '送り先を追加できませんでした。');
      setLabel('');
      setAddress({ ...EMPTY_SHIPPING_ADDRESS });
      setIsDefault(false);
      setAdding(false);
      onSelect(body.destination.id, body.destination);
      await load(body.destination.id);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '送り先を追加できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  const archiveDestination = async (id: string) => {
    if (saving || !window.confirm('この送り先を削除しますか？')) return;
    setSaving(true);
    try {
      const suffix = query ? `?${query}` : '';
      const response = await fetch(`${apiBase}/${id}${suffix}`, { method: 'DELETE' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '送り先を削除できませんでした。');
      await load();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '送り先を削除できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  const setDefaultDestination = async (id: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const suffix = query ? `?${query}` : '';
      const response = await fetch(`${apiBase}/${id}${suffix}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? '既定の送り先を変更できませんでした。');
      await load(id);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '既定の送り先を変更できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{ownerLabel}</p>
        {!readOnly && <button type="button" onClick={() => setAdding((current) => !current)} className="text-sm font-semibold text-violet-700">{adding ? '入力を閉じる' : '＋ 送り先を追加'}</button>}
      </div>
      {loading ? <p className="text-sm text-slate-400">送り先を読み込んでいます…</p> : (
        <div className="space-y-2">
          {destinations.map((destination) => (
            <div key={destination.id} className={`flex items-start gap-3 rounded-xl border p-3 ${selectedId === destination.id ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white'}`}>
              <input type="radio" name={`${apiBase}-${patientId ?? customerCode ?? 'owner'}`} checked={selectedId === destination.id} onChange={() => onSelect(destination.id, destination)} className="mt-1" />
              <button type="button" onClick={() => onSelect(destination.id, destination)} className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold text-slate-800">{destination.label}{destination.is_default && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">既定</span>}</p>
                <p className="mt-1 text-xs text-slate-500">{formatShippingAddress({ postalCode: destination.postal_code, prefecture: destination.prefecture, city: destination.city, addressLine1: destination.address_line1, addressLine2: destination.address_line2 ?? '', recipientName: destination.recipient_name, phone: destination.phone })}</p>
                <p className="mt-1 text-xs text-slate-400">{destination.recipient_name}／{destination.phone}</p>
              </button>
              {!readOnly && <div className="flex shrink-0 flex-col items-end gap-2">
                {!destination.is_default && <button type="button" disabled={saving} onClick={() => void setDefaultDestination(destination.id)} className="text-xs font-semibold text-violet-700 disabled:opacity-40">既定にする</button>}
                <button type="button" disabled={saving} onClick={() => void archiveDestination(destination.id)} className="text-xs font-semibold text-red-600 disabled:opacity-40">削除</button>
              </div>}
            </div>
          ))}
          {destinations.length === 0 && <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-800">送り先がありません。注文前に追加してください。</p>}
        </div>
      )}
      {!readOnly && adding && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="block text-sm text-slate-600">送り先名<input value={label} maxLength={50} onChange={(event) => setLabel(event.target.value)} placeholder="例：本院、自宅、勤務先" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
          <ShippingAddressFields value={address} onChange={setAddress} color={color} />
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />既定の送り先にする</label>
          <button type="button" disabled={saving || !label.trim() || Boolean(validateShippingAddress(address))} onClick={() => void createDestination()} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{saving ? '保存中…' : '送り先を保存'}</button>
        </div>
      )}
    </div>
  );
}
