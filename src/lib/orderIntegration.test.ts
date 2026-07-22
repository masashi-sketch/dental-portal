import { describe, expect, it } from 'vitest';
import { toOrderIntegrationRecord } from './orderIntegration';
import type { PatientOrder } from '@/lib/supabase/types';

const order: PatientOrder = {
  id: 'order-1',
  customer_code: 'A000001',
  patient_id: 'patient-1',
  order_type: 'one_time',
  fulfillment_method: 'pickup',
  status: 'received',
  ordered_at: '2026-07-22T00:00:00.000Z',
  next_fulfillment_date: null,
  source: 'internal',
  created_via: 'clinic_portal',
  external_order_id: null,
  sync_status: 'local',
  sync_error: null,
  idempotency_key: 'key-1',
  external_updated_at: null,
  created_at: '2026-07-22T00:00:00.000Z',
  updated_at: '2026-07-22T00:00:00.000Z',
  patient: { id: 'patient-1', patient_no: 'P000001', name: '患者 花子' },
  items: [
    {
      id: 'line-1', order_id: 'order-1', product_id: 'product-1', product_name: '商品A',
      unit_price: 1200, quantity: 2, unit_snapshot: null, image_type_snapshot: 'supplement',
      daily_amount_snapshot: null, volume_snapshot: null, caution_snapshot: null,
      external_line_item_id: null, created_at: '2026-07-22T00:00:00.000Z',
    },
  ],
};

describe('toOrderIntegrationRecord', () => {
  it('DB行を外部連携から独立した正規化注文へ変換する', () => {
    const record = toOrderIntegrationRecord(order, '広島中央歯科');

    expect(record.schemaVersion).toBe(1);
    expect(record.clinic).toEqual({ customerCode: 'A000001', name: '広島中央歯科' });
    expect(record.patient).toEqual({ id: 'patient-1', patientNo: 'P000001', name: '患者 花子' });
    expect(record.lines[0]).toMatchObject({ unitPrice: 1200, quantity: 2, lineTotal: 2400 });
    expect(record.totalAmount).toBe(2400);
    expect(record.syncStatus).toBe('local');
    expect(record.createdVia).toBe('clinic_portal');
  });

  it('自宅配送先を外部連携モデルへ変換する', () => {
    const record = toOrderIntegrationRecord({
      ...order,
      fulfillment_method: 'delivery',
      delivery_destination: {
        order_id: 'order-1', delivery_destination_id: 'destination-1', label: '自宅', postal_code: '100-0001', prefecture: '東京都', city: '千代田区',
        address_line1: '千代田1-1', address_line2: null, recipient_name: '患者 花子',
        phone: '090-1234-5678', created_at: '2026-07-22T00:00:00.000Z',
      },
    }, '広島中央歯科');

    expect(record.shippingAddress).toMatchObject({
      postalCode: '100-0001', prefecture: '東京都', recipientName: '患者 花子',
    });
  });
});
