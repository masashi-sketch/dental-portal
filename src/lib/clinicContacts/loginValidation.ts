import type { ClinicPortalRoleKey } from '@/lib/supabase/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ClinicLoginInput = {
  password: string;
  email: string;
  status: '有効' | '無効';
  roleKey: ClinicPortalRoleKey;
};

export function parseClinicLoginInput(body: unknown, creating: boolean): { value?: ClinicLoginInput; error?: string } {
  void creating;
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const password = typeof data.password === 'string' ? data.password : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const status = data.status === '無効' ? '無効' : '有効';
  const roleKey = data.roleKey === undefined ? 'staff' : data.roleKey as ClinicPortalRoleKey;
  if (password && (password.length < 8 || password.length > 128)) return { error: 'パスワードは8〜128文字で入力してください。' };
  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) return { error: 'メールアドレスの形式が不正です。' };
  if (!['admin', 'staff', 'viewer'].includes(String(roleKey))) return { error: '権限の指定が不正です。' };
  return { value: { password, email, status, roleKey } };
}
