import type { ClinicContactRoleKey } from '@/lib/supabase/types';

export const CLINIC_CONTACT_ROLE_KEYS: ClinicContactRoleKey[] = [
  'physician',
  'dentist',
  'nurse',
  'dental_hygienist',
  'receptionist',
  'other',
];

export function isClinicContactRoleKey(value: unknown): value is ClinicContactRoleKey {
  return typeof value === 'string' && CLINIC_CONTACT_ROLE_KEYS.includes(value as ClinicContactRoleKey);
}
