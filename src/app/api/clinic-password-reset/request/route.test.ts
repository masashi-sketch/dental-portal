// @vitest-environment node
// 認証不要の公開エンドポイント。担当者ID・メールの登録有無に関わらず常に同じ
// レスポンスを返すこと（アドレス探索対策）と、クールダウン中はトークン発行・
// メール送信をスキップすること（メール爆撃対策）を検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type ClinicUserRow = { id: string; name: string | null; login_id: string; customer_code: string; email: string } | null;
let clinicUserRow: ClinicUserRow = null;
const clinicUserEqMock = vi.fn();

// afterはレスポンス送信後に実行されるため、テストではコールバックを溜めて
// 明示的に実行する。
const afterCallbacks: Array<() => Promise<void>> = [];
vi.mock('next/server', async (importOriginal) => {
  const mod = await importOriginal<typeof import('next/server')>();
  return { ...mod, after: (cb: () => Promise<void>) => afterCallbacks.push(cb) };
});

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'clinic_users') {
        const query = {
          eq: (column: string, value: unknown) => { clinicUserEqMock(column, value); return query; },
          maybeSingle: async () => ({ data: clinicUserRow }),
        };
        return {
          select: () => query,
        };
      }
      if (table === 'clinics') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { name: '中央歯科' } }) }) }) };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const createClinicLoginTokenMock = vi.fn(async () => 'tok123');
const hasRecentClinicLoginTokenMock = vi.fn(async () => false);
vi.mock('@/lib/auth/clinicLoginToken', () => ({
  createClinicLoginToken: (...args: unknown[]) => createClinicLoginTokenMock(...(args as [])),
  hasRecentClinicLoginToken: (...args: unknown[]) => hasRecentClinicLoginTokenMock(...(args as [])),
}));

const sendPatientEmailMock = vi.fn(async () => {});
vi.mock('@/lib/email/sendEmail', () => ({
  sendPatientEmail: (...args: unknown[]) => sendPatientEmailMock(...(args as [])),
}));

const { POST } = await import('./route');

function resetRequest(email: unknown, loginId: unknown = 'A000001') {
  return new NextRequest('http://localhost/api/clinic-password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email, loginId }),
  });
}

async function runAfterCallbacks() {
  for (const cb of afterCallbacks.splice(0)) await cb();
}

describe('POST /api/clinic-password-reset/request', () => {
  beforeEach(() => {
    clinicUserRow = null;
    afterCallbacks.length = 0;
    createClinicLoginTokenMock.mockClear();
    hasRecentClinicLoginTokenMock.mockClear();
    hasRecentClinicLoginTokenMock.mockResolvedValue(false);
    sendPatientEmailMock.mockClear();
    clinicUserEqMock.mockClear();
  });

  it('未登録の担当者ID・メールでも同じ成功レスポンスを返し、トークン発行・送信は行わない', async () => {
    const res = await POST(resetRequest('unknown@example.com'));
    await runAfterCallbacks();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(createClinicLoginTokenMock).not.toHaveBeenCalled();
    expect(sendPatientEmailMock).not.toHaveBeenCalled();
  });

  it('登録済みのメールアドレスならトークンを発行し、レスポンス後にメールを送信する', async () => {
    clinicUserRow = { id: 'clinic-user-1', name: '営業太郎', login_id: 'chuo-shika', customer_code: 'A000001', email: 'staff@example.com' };
    const res = await POST(resetRequest('STAFF@example.com'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(createClinicLoginTokenMock).toHaveBeenCalled();
    expect(clinicUserEqMock).toHaveBeenCalledWith('login_id', 'A000001');
    expect(clinicUserEqMock).toHaveBeenCalledWith('email', 'staff@example.com');
    // メール送信はafterコールバック内（レスポンス送信後）
    expect(sendPatientEmailMock).not.toHaveBeenCalled();
    await runAfterCallbacks();
    expect(sendPatientEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'staff@example.com', senderName: '中央歯科' }),
    );
  });

  it('クールダウン中は同じ成功レスポンスのまま、トークン発行・送信をスキップする', async () => {
    clinicUserRow = { id: 'clinic-user-1', name: '営業太郎', login_id: 'chuo-shika', customer_code: 'A000001', email: 'staff@example.com' };
    hasRecentClinicLoginTokenMock.mockResolvedValue(true);
    const res = await POST(resetRequest('staff@example.com'));
    await runAfterCallbacks();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(createClinicLoginTokenMock).not.toHaveBeenCalled();
    expect(sendPatientEmailMock).not.toHaveBeenCalled();
  });

  it('メールアドレスが空でも同じ成功レスポンスを返す', async () => {
    const res = await POST(resetRequest(''));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('担当者IDが空でも同じ成功レスポンスを返す', async () => {
    const res = await POST(resetRequest('staff@example.com', ''));
    expect(res.status).toBe(200);
    expect(createClinicLoginTokenMock).not.toHaveBeenCalled();
  });
});
