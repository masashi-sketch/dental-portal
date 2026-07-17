// @vitest-environment node
// 認証不要の公開エンドポイント。メールアドレスの登録有無に関わらず常に同じ
// レスポンスを返すこと（アドレス探索対策）と、クールダウン中はトークン発行・
// メール送信をスキップすること（メール爆撃対策）を検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type PatientRow = { id: string; name: string; customer_code: string; email: string } | null;
let patientRow: PatientRow = null;

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
      if (table === 'patients') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: patientRow }) }) }),
          }),
        };
      }
      if (table === 'clinics') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { name: '中央歯科' } }) }) }) };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const createLoginTokenMock = vi.fn(async () => 'tok123');
const hasRecentLoginTokenMock = vi.fn(async () => false);
vi.mock('@/lib/auth/loginToken', () => ({
  createLoginToken: (...args: unknown[]) => createLoginTokenMock(...(args as [])),
  hasRecentLoginToken: (...args: unknown[]) => hasRecentLoginTokenMock(...(args as [])),
}));

const resolveClinicEmailMock = vi.fn(async () => ({ senderName: '中央歯科', subject: '件名', body: '本文' }));
vi.mock('@/lib/email/resolveClinicEmail', () => ({
  resolveClinicEmail: (...args: unknown[]) => resolveClinicEmailMock(...(args as [])),
}));

const sendPatientEmailMock = vi.fn(async () => {});
vi.mock('@/lib/email/sendEmail', () => ({
  sendPatientEmail: (...args: unknown[]) => sendPatientEmailMock(...(args as [])),
}));

const { POST } = await import('./route');

function resetRequest(email: unknown) {
  return new NextRequest('http://localhost/api/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

async function runAfterCallbacks() {
  for (const cb of afterCallbacks.splice(0)) await cb();
}

describe('POST /api/password-reset/request', () => {
  beforeEach(() => {
    patientRow = null;
    afterCallbacks.length = 0;
    createLoginTokenMock.mockClear();
    hasRecentLoginTokenMock.mockClear();
    hasRecentLoginTokenMock.mockResolvedValue(false);
    sendPatientEmailMock.mockClear();
  });

  it('未登録のメールアドレスでも同じ成功レスポンスを返し、トークン発行・送信は行わない', async () => {
    const res = await POST(resetRequest('unknown@example.com'));
    await runAfterCallbacks();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(createLoginTokenMock).not.toHaveBeenCalled();
    expect(sendPatientEmailMock).not.toHaveBeenCalled();
  });

  it('登録済みのメールアドレスならトークンを発行し、レスポンス後にメールを送信する', async () => {
    patientRow = { id: 'patient-1', name: '山田太郎', customer_code: 'A000001', email: 'yamada@example.com' };
    const res = await POST(resetRequest('yamada@example.com'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(createLoginTokenMock).toHaveBeenCalled();
    // メール送信はafterコールバック内（レスポンス送信後）
    expect(sendPatientEmailMock).not.toHaveBeenCalled();
    await runAfterCallbacks();
    expect(sendPatientEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'yamada@example.com', senderName: '中央歯科' }),
    );
  });

  it('クールダウン中は同じ成功レスポンスのまま、トークン発行・送信をスキップする', async () => {
    patientRow = { id: 'patient-1', name: '山田太郎', customer_code: 'A000001', email: 'yamada@example.com' };
    hasRecentLoginTokenMock.mockResolvedValue(true);
    const res = await POST(resetRequest('yamada@example.com'));
    await runAfterCallbacks();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(createLoginTokenMock).not.toHaveBeenCalled();
    expect(sendPatientEmailMock).not.toHaveBeenCalled();
  });

  it('メールアドレスが空でも同じ成功レスポンスを返す', async () => {
    const res = await POST(resetRequest(''));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
