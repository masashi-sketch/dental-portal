import type {
  CommerceSource,
  CommerceSyncStatus,
  FulfillmentMethod,
  PatientOrderStatus,
  PatientOrderType,
} from '@/lib/supabase/types';

export const ORDER_STATUS_LABEL: Record<PatientOrderStatus, string> = {
  received: '受付済み',
  preparing: '準備中',
  ready: '準備完了',
  shipped: '配送中',
  completed: '受け取り済み',
  canceled: 'キャンセル',
};

export const ORDER_STATUS_OPTIONS = Object.keys(ORDER_STATUS_LABEL) as PatientOrderStatus[];

export const ORDER_TYPE_LABEL: Record<PatientOrderType, string> = {
  one_time: '通常注文',
  subscription: '定期購入',
};

export const FULFILLMENT_METHOD_LABEL: Record<FulfillmentMethod, string> = {
  pickup: '医院受け取り',
  delivery: '自宅配送',
};

export const COMMERCE_SOURCE_LABEL: Record<CommerceSource, string> = {
  internal: '医院登録',
  shopify: 'Shopify',
};

export const COMMERCE_SYNC_STATUS_LABEL: Record<CommerceSyncStatus, string> = {
  local: '内部管理',
  pending: '連携待ち',
  synced: '連携済み',
  error: '連携エラー',
};

const ALLOWED_TRANSITIONS: Record<PatientOrderStatus, PatientOrderStatus[]> = {
  received: ['preparing', 'canceled'],
  preparing: ['ready', 'shipped', 'canceled'],
  ready: ['completed', 'canceled'],
  shipped: ['completed', 'canceled'],
  completed: [],
  canceled: [],
};

export function canTransitionOrderStatus(
  from: PatientOrderStatus,
  to: PatientOrderStatus,
  fulfillmentMethod?: FulfillmentMethod,
) {
  if (fulfillmentMethod === 'pickup' && to === 'shipped') return false;
  if (fulfillmentMethod === 'delivery' && to === 'ready') return false;
  return from === to || ALLOWED_TRANSITIONS[from].includes(to);
}

export function getSelectableOrderStatuses(status: PatientOrderStatus, fulfillmentMethod: FulfillmentMethod) {
  return ORDER_STATUS_OPTIONS.filter((candidate) => canTransitionOrderStatus(status, candidate, fulfillmentMethod));
}
