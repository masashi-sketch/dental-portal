import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BiogaiaPage from './page';

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

describe('BiogaiaPage', () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'clinic' } }, status: 'authenticated' });
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/bgj/external-links') return jsonResponse({ externalLinks: [] });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('サンプル表示であることを注記し、追加ボタンを無効化する', () => {
    render(<BiogaiaPage />);
    expect(
      screen.getByText('この一覧は掲載イメージのサンプル表示です。配信主体・保存先が確定するまで、追加・編集・削除は行えません。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '＋ 追加' })).toBeDisabled();
  });

  it('一覧表示の編集・削除ボタンをすべて無効化する', () => {
    render(<BiogaiaPage />);
    const editButtons = screen.getAllByRole('button', { name: '編集' });
    const deleteButtons = screen.getAllByRole('button', { name: '削除' });
    expect(editButtons.length).toBeGreaterThan(0);
    expect(deleteButtons.length).toBeGreaterThan(0);
    editButtons.forEach((button) => expect(button).toBeDisabled());
    deleteButtons.forEach((button) => expect(button).toBeDisabled());
  });

  it('削除ボタンをクリックしても確認ダイアログや削除は発生しない', () => {
    render(<BiogaiaPage />);
    const rowsBefore = screen.getAllByRole('button', { name: '削除' }).length;
    fireEvent.click(screen.getAllByRole('button', { name: '削除' })[0]);
    expect(screen.queryByText('削除しますか？')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '削除' }).length).toBe(rowsBefore);
  });

  it('カード表示に切り替えても編集・削除ボタンは無効のまま', () => {
    render(<BiogaiaPage />);
    fireEvent.click(screen.getByRole('button', { name: /カード/ }));
    const editButtons = screen.getAllByRole('button', { name: '編集' });
    const deleteButtons = screen.getAllByRole('button', { name: '削除' });
    editButtons.forEach((button) => expect(button).toBeDisabled());
    deleteButtons.forEach((button) => expect(button).toBeDisabled());
  });
});
