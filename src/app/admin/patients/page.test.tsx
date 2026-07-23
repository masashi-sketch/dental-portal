import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminPatientsPage from './page';
import { clearTestPortalPreview, setTestPortalPreview } from '@/test/portalPreview';

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
    clearTestPortalPreview();
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
    clearTestPortalPreview();
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

  it('BGJ職員がビューモード（bgj-viewing-customer-code cookie）ではない場合、QR招待ボタンは表示されない', async () => {
    document.cookie = 'bgj-viewing-customer-code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    render(<AdminPatientsPage />);
    await screen.findByText('患者様がまだ登録されていません');
    expect(screen.queryByText('QRで招待')).not.toBeInTheDocument();
  });

  it('BGJ職員がビューモード中は、QR招待ボタンが表示され、新規患者IDの得意先コードが自動入力される', async () => {
    setTestPortalPreview('clinic', 'A000001');
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/bgj/external-links') return jsonResponse({ externalLinks: [] });
      if (url === '/api/admin/patients') return jsonResponse({ patients: [] });
      if (url === '/api/admin/clinic-info?customerCode=A000001') {
        return jsonResponse({ clinic: { customer_code: 'A000001', name: 'ビュー先歯科' } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    render(<AdminPatientsPage />);
    await screen.findByText('患者様がまだ登録されていません');
    expect(await screen.findByText('QRで招待')).toBeInTheDocument();

    fireEvent.click(screen.getByText('＋ 患者IDを発行'));
    expect(screen.getByDisplayValue('A000001')).toBeInTheDocument();

    document.cookie = 'bgj-viewing-customer-code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });
});
