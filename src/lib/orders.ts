import type { FulfillmentMethod, PatientOrderStatus } from '@/lib/supabase/types';

export const ORDER_STATUS_LABEL: Record<PatientOrderStatus, string> = {
  received: '受付済み',
  preparing: '準備中',
  ready: '準備完了',
  shipped: '配送中',
  completed: '受け取り済み',
  canceled: 'キャンセル',
};

export const ORDER_STATUS_OPTIONS = Object.keys(ORDER_STATUS_LABEL) as PatientOrderStatus[];

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
