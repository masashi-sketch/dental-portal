import type { ClinicPortalRoleKey } from '@/lib/supabase/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ClinicLoginInput = {
  loginId: string;
  password: string;
  email: string;
  status: '有効' | '無効';
  roleKey: ClinicPortalRoleKey;
};

export function parseClinicLoginInput(body: unknown, creating: boolean): { value?: ClinicLoginInput; error?: string } {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const loginId = typeof data.loginId === 'string' ? data.loginId.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const status = data.status === '無効' ? '無効' : '有効';
  const roleKey = data.roleKey === undefined ? 'staff' : data.roleKey as ClinicPortalRoleKey;
  if (loginId.length < 3 || loginId.length > 100 || /\s/.test(loginId)) return { error: 'ログインIDは空白を含まない3〜100文字で入力してください。' };
  if (creating && !password) return { error: '初期パスワードは必須です。' };
  if (password && (password.length < 8 || password.length > 128)) return { error: 'パスワードは8〜128文字で入力してください。' };
  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) return { error: 'メールアドレスの形式が不正です。' };
  if (!['admin', 'staff', 'viewer'].includes(String(roleKey))) return { error: '権限の指定が不正です。' };
  return { value: { loginId, password, email, status, roleKey } };
}
