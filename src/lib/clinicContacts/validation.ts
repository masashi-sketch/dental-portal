import type { ClinicContactStatus, ClinicContactTopic } from '@/lib/supabase/types';

export const CLINIC_CONTACT_TOPICS: ClinicContactTopic[] = ['webinar', 'orders', 'billing', 'product', 'system', 'sales'];

export type ClinicContactInput = {
  id: string | null;
  version: number;
  clinicUserId: string | null;
  name: string;
  department: string;
  title: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  status: ClinicContactStatus;
  notes: string;
  emailTopics: ClinicContactTopic[];
  phoneTopics: ClinicContactTopic[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-ー－\s]{6,30}$/;

export function parseClinicContactInput(body: unknown): { value?: ClinicContactInput; error?: string } {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  const status = data.status === 'inactive' ? 'inactive' : 'active';
  const hasInvalidTopic = (value: unknown) => value !== undefined && (
    !Array.isArray(value)
    || value.some((topic) => typeof topic !== 'string' || !CLINIC_CONTACT_TOPICS.includes(topic as ClinicContactTopic))
  );
  if (hasInvalidTopic(data.emailTopics) || hasInvalidTopic(data.phoneTopics)) {
    return { error: '通知種別が不正です。' };
  }
  const topics = (value: unknown) => Array.isArray(value)
    ? [...new Set(value as ClinicContactTopic[])]
    : [];
  const emailTopics = topics(data.emailTopics);
  const phoneTopics = topics(data.phoneTopics);

  if (!name || name.length > 100) return { error: '担当者名は100文字以内で入力してください。' };
  if (!email && !phone) return { error: 'メールアドレスまたは電話番号を入力してください。' };
  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) return { error: 'メールアドレスの形式が不正です。' };
  if (phone && !PHONE_PATTERN.test(phone)) return { error: '電話番号の形式が不正です。' };
  if (!email && emailTopics.length) return { error: 'メール通知を選ぶ場合はメールアドレスが必要です。' };
  if (!phone && phoneTopics.length) return { error: '電話連絡を選ぶ場合は電話番号が必要です。' };
  const department = typeof data.department === 'string' ? data.department.trim() : '';
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const notes = typeof data.notes === 'string' ? data.notes.trim() : '';
  if (department.length > 100 || title.length > 100 || notes.length > 1000) return { error: '部署・役職・備考の文字数を確認してください。' };

  return { value: {
    id: typeof data.id === 'string' && data.id ? data.id : null,
    version: Number.isInteger(data.version) && Number(data.version) > 0 ? Number(data.version) : 1,
    clinicUserId: typeof data.clinicUserId === 'string' && data.clinicUserId ? data.clinicUserId : null,
    name, department, title, email, phone,
    isPrimary: Boolean(data.isPrimary) && status === 'active', status, notes, emailTopics, phoneTopics,
  } };
}
