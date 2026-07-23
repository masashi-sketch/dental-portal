import type { ClinicContactTopic } from '@/lib/supabase/types';

export const CLINIC_CONTACT_TOPIC_OPTIONS: { key: ClinicContactTopic; label: string }[] = [
  { key: 'webinar', label: 'ウェビナー' },
  { key: 'orders', label: '受注・定期購入' },
  { key: 'billing', label: '請求' },
  { key: 'product', label: '商品・キャンペーン' },
  { key: 'system', label: 'システム連絡' },
  { key: 'sales', label: '営業連絡' },
];

export const CLINIC_CONTACT_TOPIC_LABEL = Object.fromEntries(
  CLINIC_CONTACT_TOPIC_OPTIONS.map((topic) => [topic.key, topic.label]),
) as Record<ClinicContactTopic, string>;
