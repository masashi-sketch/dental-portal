import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminPatientsPage from './page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'BGJ担当者', role: 'bgj' } }, status: 'authenticated' }),
  signOut: vi.fn(),
}));

vi.mock('@/hooks/useActiveClinic', () => ({
  useActiveClinic: () => ({ clinicName: null, salesRep: null, loaded: true }),
}));

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data, headers: { get: () => 'application/json' } });
}

// セッションが別タブでpatientロールに切り替わった等で、APIが本来のJSONではなく
// ログイン画面等のHTML（200 OK）を返してしまうケースを模す。
function htmlResponse() {
  return Promise.resolve({
    ok: true,
    json: async () => {
      throw new SyntaxError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON");
    },
    headers: { get: () => 'text/html; charset=utf-8' },
  });
}

describe('AdminPatientsPage 一覧取得エラー表示', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/bgj/external-links') return jsonResponse({ externalLinks: [] });
      if (url === '/api/admin/patients') return jsonResponse({ patients: [] });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('通常時は患者一覧を表示する', async () => {
    render(<AdminPatientsPage />);
    expect(await screen.findByText('患者様がまだ登録されていません')).toBeInTheDocument();
  });

  it('セッション切り替わり等でHTMLが返ってきた場合、分かりやすいエラーメッセージを表示する（生のJSONパースエラーを出さない）', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/bgj/external-links') return jsonResponse({ externalLinks: [] });
      if (url === '/api/admin/patients') return htmlResponse();
      throw new Error(`unexpected fetch: ${url}`);
    });
    render(<AdminPatientsPage />);

    expect(await screen.findByText('セッションの状態が変わった可能性があります。ページを再読み込みしてください。')).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected token/)).not.toBeInTheDocument();
  });
});
