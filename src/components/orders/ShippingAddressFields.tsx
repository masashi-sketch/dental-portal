'use client';

import { PREFECTURES } from '@/lib/prefectures';
import type { ShippingAddressInput } from '@/lib/shippingAddress';

type Props = {
  value: ShippingAddressInput;
  onChange: (value: ShippingAddressInput) => void;
  color?: 'sky' | 'violet' | 'indigo';
};

const focusClass = {
  sky: 'focus:border-sky-400 focus:ring-sky-100',
  violet: 'focus:border-violet-400 focus:ring-violet-100',
  indigo: 'focus:border-indigo-400 focus:ring-indigo-100',
};

export default function ShippingAddressFields({ value, onChange, color = 'violet' }: Props) {
  const fieldClass = `mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 ${focusClass[color]}`;
  const update = (key: keyof ShippingAddressInput, next: string) => onChange({ ...value, [key]: next });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-sm text-slate-600">郵便番号
        <input value={value.postalCode} onChange={(event) => update('postalCode', event.target.value)} inputMode="numeric" autoComplete="postal-code" placeholder="100-0001" maxLength={8} className={fieldClass} />
      </label>
      <label className="text-sm text-slate-600">都道府県
        <select value={value.prefecture} onChange={(event) => update('prefecture', event.target.value)} autoComplete="address-level1" className={fieldClass}>
          <option value="">選択してください</option>
          {PREFECTURES.map((prefecture) => <option key={prefecture} value={prefecture}>{prefecture}</option>)}
        </select>
      </label>
      <label className="text-sm text-slate-600">市区町村
        <input value={value.city} onChange={(event) => update('city', event.target.value)} autoComplete="address-level2" maxLength={100} placeholder="千代田区" className={fieldClass} />
      </label>
      <label className="text-sm text-slate-600">番地
        <input value={value.addressLine1} onChange={(event) => update('addressLine1', event.target.value)} autoComplete="address-line1" maxLength={200} placeholder="千代田1-1" className={fieldClass} />
      </label>
      <label className="text-sm text-slate-600 sm:col-span-2">建物名・部屋番号（任意）
        <input value={value.addressLine2} onChange={(event) => update('addressLine2', event.target.value)} autoComplete="address-line2" maxLength={200} placeholder="〇〇マンション101号室" className={fieldClass} />
      </label>
      <label className="text-sm text-slate-600">受取人名
        <input value={value.recipientName} onChange={(event) => update('recipientName', event.target.value)} autoComplete="name" maxLength={100} className={fieldClass} />
      </label>
      <label className="text-sm text-slate-600">電話番号
        <input value={value.phone} onChange={(event) => update('phone', event.target.value)} inputMode="tel" autoComplete="tel" maxLength={30} placeholder="090-1234-5678" className={fieldClass} />
      </label>
    </div>
  );
}
