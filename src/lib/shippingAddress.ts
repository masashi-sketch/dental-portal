import { PREFECTURES } from '@/lib/prefectures';

export type ShippingAddressInput = {
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  recipientName: string;
  phone: string;
};

export const EMPTY_SHIPPING_ADDRESS: ShippingAddressInput = {
  postalCode: '',
  prefecture: '',
  city: '',
  addressLine1: '',
  addressLine2: '',
  recipientName: '',
  phone: '',
};

export function normalizeShippingAddress(value: ShippingAddressInput): ShippingAddressInput {
  const postalDigits = value.postalCode.replace(/[^0-9]/g, '').slice(0, 7);
  return {
    postalCode: postalDigits.length === 7 ? `${postalDigits.slice(0, 3)}-${postalDigits.slice(3)}` : value.postalCode.trim(),
    prefecture: value.prefecture.trim(),
    city: value.city.trim(),
    addressLine1: value.addressLine1.trim(),
    addressLine2: value.addressLine2.trim(),
    recipientName: value.recipientName.trim(),
    phone: value.phone.trim(),
  };
}

export function validateShippingAddress(value: ShippingAddressInput): string | null {
  const address = normalizeShippingAddress(value);
  if (!/^\d{3}-\d{4}$/.test(address.postalCode)) return '郵便番号は7桁で入力してください。';
  if (!PREFECTURES.includes(address.prefecture as (typeof PREFECTURES)[number])) return '都道府県を選択してください。';
  if (!address.city || address.city.length > 100) return '市区町村を100文字以内で入力してください。';
  if (!address.addressLine1 || address.addressLine1.length > 200) return '番地を200文字以内で入力してください。';
  if (address.addressLine2.length > 200) return '建物名・部屋番号を200文字以内で入力してください。';
  if (!address.recipientName || address.recipientName.length > 100) return '受取人名を100文字以内で入力してください。';
  const phoneDigits = address.phone.replace(/[^0-9]/g, '');
  if (!/^[0-9+() -]{8,30}$/.test(address.phone) || phoneDigits.length < 10 || phoneDigits.length > 15) return '電話番号を正しく入力してください。';
  return null;
}

export function readShippingAddress(value: unknown): ShippingAddressInput | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const keys: Array<keyof ShippingAddressInput> = [
    'postalCode', 'prefecture', 'city', 'addressLine1', 'addressLine2', 'recipientName', 'phone',
  ];
  if (keys.some((key) => typeof raw[key] !== 'string')) return null;
  const address = normalizeShippingAddress(raw as ShippingAddressInput);
  return validateShippingAddress(address) ? null : address;
}

export function formatShippingAddress(value: ShippingAddressInput) {
  const address = normalizeShippingAddress(value);
  return `〒${address.postalCode} ${address.prefecture}${address.city}${address.addressLine1}${address.addressLine2 ? ` ${address.addressLine2}` : ''}`;
}
