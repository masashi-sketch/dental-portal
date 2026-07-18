import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminNewsPage from './page';

const useSessionMock = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => useSessionMock(),
}));

vi.mock('@/hooks/useActiveClinic', () => ({
  useActiveClinic: () => ({ clinicName: null, salesRep: null, loaded: true }),
}));

const fetchMock = vi.fn();

describe('AdminNewsPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ announcements: [] }) });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('clinicロールでなければ案内文を表示し、管理画面は表示しない', () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'bgj' } }, status: 'authenticated' });
    render(<AdminNewsPage />);
    expect(screen.getByText('この画面はクリニックログイン専用です')).toBeInTheDocument();
    expect(screen.queryByText('＋ 追加')).not.toBeInTheDocument();
  });

  it('clinicロールならお知らせ管理コンポーネントを表示する', async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'clinic' } }, status: 'authenticated' });
    render(<AdminNewsPage />);
    expect(await screen.findByText('お知らせがまだ登録されていません')).toBeInTheDocument();
  });
});
