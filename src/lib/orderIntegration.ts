import type { Clinic, PatientOrder } from '@/lib/supabase/types';

export const ORDER_INTEGRATION_SCHEMA_VERSION = 1 as const;

export type OrderIntegrationRecord = {
  schemaVersion: typeof ORDER_INTEGRATION_SCHEMA_VERSION;
  orderId: string;
  externalOrderId: string | null;
  source: PatientOrder['source'];
  createdVia: PatientOrder['created_via'];
  syncStatus: PatientOrder['sync_status'];
  syncError: string | null;
  externalUpdatedAt: string | null;
  orderedAt: string;
  updatedAt: string;
  orderType: PatientOrder['order_type'];
  fulfillmentMethod: PatientOrder['fulfillment_method'];
  status: PatientOrder['status'];
  nextFulfillmentDate: string | null;
  clinic: {
    customerCode: string;
    name: string | null;
  };
  patient: {
    id: string;
    patientNo: string | null;
    name: string | null;
  };
  lines: Array<{
    lineId: string;
    productId: string | null;
    externalLineItemId: string | null;
    productName: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  totalAmount: number;
};

export type BgjOrdersResponse = {
  orders: OrderIntegrationRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export function toOrderIntegrationRecord(
  order: PatientOrder,
  clinicName: Clinic['name'] | null,
): OrderIntegrationRecord {
  const lines = order.items.map((item) => ({
    lineId: item.id,
    productId: item.product_id,
    externalLineItemId: item.external_line_item_id,
    productName: item.product_name,
    unitPrice: item.unit_price,
    quantity: item.quantity,
    lineTotal: item.unit_price * item.quantity,
  }));

  return {
    schemaVersion: ORDER_INTEGRATION_SCHEMA_VERSION,
    orderId: order.id,
    externalOrderId: order.external_order_id,
    source: order.source,
    createdVia: order.created_via,
    syncStatus: order.sync_status,
    syncError: order.sync_error,
    externalUpdatedAt: order.external_updated_at,
    orderedAt: order.ordered_at,
    updatedAt: order.updated_at,
    orderType: order.order_type,
    fulfillmentMethod: order.fulfillment_method,
    status: order.status,
    nextFulfillmentDate: order.next_fulfillment_date,
    clinic: { customerCode: order.customer_code, name: clinicName },
    patient: {
      id: order.patient_id,
      patientNo: order.patient?.patient_no ?? null,
      name: order.patient?.name ?? null,
    },
    lines,
    totalAmount: lines.reduce((sum, line) => sum + line.lineTotal, 0),
  };
}
