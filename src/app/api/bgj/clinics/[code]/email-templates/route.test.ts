// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

let sessionValue: Session | null = null;
vi.mock('@/auth', () => ({
  auth: async () => sessionValue,
}));

let templateRow: Record<string, unknown> | null = null;
const upsertSpy = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: templateRow, error: null }),
        }),
      }),
      upsert: (row: Record<string, unknown>) => {
        upsertSpy(row);
        return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
      },
    }),
  }),
}));

const { GET, PATCH } = await import('./route');

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: { role: 'bgj', customerCode: null, patientId: null, email: 'staff@biogaia.jp', ...overrides },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/bgj/clinics/A000001/email-templates', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ code: 'A000001' });

describe('GET /api/bgj/clinics/[code]/email-templates', () => {
  beforeEach(() => {
    sessionValue = null;
    templateRow = null;
  });

  it('未認証なら401', async () => {
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001/email-templates'), { params });
    expect(res.status).toBe(401);
  });

  it('clinicロールは401（BGJ専用）', async () => {
    sessionValue = makeSession({ role: 'clinic', customerCode: 'A000001' });
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001/email-templates'), { params });
    expect(res.status).toBe(401);
  });

  it('行が無い場合は空テンプレートを返す', async () => {
    sessionValue = makeSession();
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001/email-templates'), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.template).toEqual({
      customer_code: 'A000001',
      sender_name: null,
      welcome_subject: null,
      welcome_body: null,
      password_reset_subject: null,
      password_reset_body: null,
    });
  });

  it('行があればそのまま返す', async () => {
    sessionValue = makeSession();
    templateRow = { customer_code: 'A000001', sender_name: 'サンプル歯科' };
    const res = await GET(new NextRequest('http://localhost/api/bgj/clinics/A000001/email-templates'), { params });
    const body = await res.json();
    expect(body.template).toEqual(templateRow);
  });
});

describe('PATCH /api/bgj/clinics/[code]/email-templates', () => {
  beforeEach(() => {
    sessionValue = null;
    upsertSpy.mockReset();
  });

  it('未認証なら401（更新しない）', async () => {
    const res = await PATCH(patchRequest({ senderName: 'X' }), { params });
    expect(res.status).toBe(401);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('空文字を渡すとnullで保存される（デフォルトへ戻す）', async () => {
    sessionValue = makeSession();
    await PATCH(patchRequest({ senderName: '' }), { params });
    expect(upsertSpy).toHaveBeenCalledWith(expect.objectContaining({ customer_code: 'A000001', sender_name: null }));
  });

  it('値を渡すとその値で更新される', async () => {
    sessionValue = makeSession();
    await PATCH(patchRequest({ senderName: 'サンプル歯科', welcomeSubject: 'ようこそ' }), { params });
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ customer_code: 'A000001', sender_name: 'サンプル歯科', welcome_subject: 'ようこそ' }),
    );
  });
});
