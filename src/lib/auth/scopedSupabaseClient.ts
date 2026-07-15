import 'server-only';
import { createHmac } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Session } from 'next-auth';

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function signSupabaseJwt(claims: Record<string, unknown>): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET が .env.local に設定されていません。');
  }
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { ...claims, iat: now, exp: now + 60 }; // 60秒の使い捨てトークン
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

// NextAuthのセッション（role/customerCode/patientId）をクレームに埋め込んだ
// Supabase互換JWTを都度発行し、service_roleではなくanonキー相当のクライアントで
// 接続する。RLSポリシー側は auth.jwt() ->> 'app_role' / 'customer_code' / 'patient_id'
// でこれらを参照し、DBレベルでもテナント分離を効かせる（アプリ層の認可が万一
// 誤っていても、DBが他人のデータを返さないようにするための多層防御）。
export function getScopedSupabaseClient(session: Session): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY が .env.local に設定されていません。');
  }

  const jwt = signSupabaseJwt({
    role: 'authenticated',
    aud: 'authenticated',
    sub: session.user.patientId ?? 'staff',
    app_role: session.user.role,
    customer_code: session.user.customerCode,
    patient_id: session.user.patientId,
  });

  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}
