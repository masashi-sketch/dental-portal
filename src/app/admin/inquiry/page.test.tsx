import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminInquiryPage from './page';

const useSessionMock = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => useSessionMock(),
}));

vi.mock('@/hooks/useActiveClinic', () => ({
  useActiveClinic: () => ({ clinicName: null, salesRep: null, loaded: true }),
}));

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

describe('AdminInquiryPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    // AdminSidebarがマウント時にLINKS欄用の外部リンクを取得するため、
    // 個別テストで上書きしない限りは空配列を返す。
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/bgj/external-links') return jsonResponse({ externalLinks: [] });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clinicロールでなければフォームを表示せず案内文を出す', () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'bgj' } }, status: 'authenticated' });
    render(<AdminInquiryPage />);
    expect(screen.getByText('この画面はクリニックログイン専用です')).toBeInTheDocument();
    expect(screen.queryByText('送信する')).not.toBeInTheDocument();
  });

  it('clinicロールならフォームを表示する', () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'clinic' } }, status: 'authenticated' });
    render(<AdminInquiryPage />);
    expect(screen.getByPlaceholderText('例）在庫について')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送信する' })).toBeInTheDocument();
  });

  it('未入力で送信するとトースト警告を出し、POSTしない', () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'clinic' } }, status: 'authenticated' });
    render(<AdminInquiryPage />);
    fireEvent.click(screen.getByRole('button', { name: '送信する' }));
    expect(screen.getByText('件名と本文を入力してください')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toBe(false);
  });

  it('入力して送信するとPOSTし、成功メッセージを表示してフォームをクリアする', async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'clinic' } }, status: 'authenticated' });
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/bgj/external-links') return jsonResponse({ externalLinks: [] });
      return jsonResponse({ inquiry: { id: 'inq-1' } }, true);
    });
    render(<AdminInquiryPage />);
    fireEvent.change(screen.getByPlaceholderText('例）在庫について'), { target: { value: '在庫について' } });
    fireEvent.change(screen.getByPlaceholderText('お問い合わせ内容をご記入ください'), { target: { value: '不足しています' } });
    fireEvent.click(screen.getByRole('button', { name: '送信する' }));
    expect(await screen.findByText('送信しました。担当者からの返信をお待ちください。')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('例）在庫について')).toHaveValue('');
    const postCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body).toEqual({ subject: '在庫について', body: '不足しています' });
  });

  it('送信失敗時はエラーメッセージをトースト表示する', async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'clinic' } }, status: 'authenticated' });
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/bgj/external-links') return jsonResponse({ externalLinks: [] });
      return jsonResponse({ error: '送信できませんでした' }, false);
    });
    render(<AdminInquiryPage />);
    fireEvent.change(screen.getByPlaceholderText('例）在庫について'), { target: { value: '件名' } });
    fireEvent.change(screen.getByPlaceholderText('お問い合わせ内容をご記入ください'), { target: { value: '本文' } });
    fireEvent.click(screen.getByRole('button', { name: '送信する' }));
    expect(await screen.findByText('送信できませんでした')).toBeInTheDocument();
  });
});
