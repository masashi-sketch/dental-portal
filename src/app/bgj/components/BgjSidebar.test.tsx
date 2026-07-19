import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BgjSidebar from './BgjSidebar';

const usePathnameMock = vi.fn();
const useSearchParamsMock = vi.fn(() => new URLSearchParams());
vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: '山田太郎', email: 'yamada@biogaia.jp' } } }),
  signOut: vi.fn(),
}));

describe('BgjSidebar', () => {
  it('マスタ・システム管理・ヘルプの各グループラベルとLINKマスタへのリンクを表示する', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    const labels = screen.getAllByText('マスタ');
    expect(labels.length).toBeGreaterThan(0);
    expect(screen.getAllByText('システム管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ヘルプ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LINKマスタ').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /LINKマスタ/ })[0]).toHaveAttribute('href', '/bgj/master/links');
  });

  it('システム管理グループの先頭にシステムダッシュボードへのリンクを表示する', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    expect(screen.getAllByRole('link', { name: 'システムダッシュボード' })[0]).toHaveAttribute(
      'href',
      '/bgj/system/dashboard'
    );
  });

  it('DB管理・アプリ管理・共通マスタは普段は非表示で、システムダッシュボードのトグルをクリックすると表示される', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    expect(screen.queryByText('DB管理')).not.toBeInTheDocument();
    expect(screen.queryByText('アプリ管理')).not.toBeInTheDocument();
    expect(screen.queryByText('共通マスタ')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('システムダッシュボードの詳細を開く')[0]);

    expect(screen.getAllByRole('link', { name: 'DB管理' })[0]).toHaveAttribute('href', '/bgj/system/db');
    expect(screen.getAllByRole('link', { name: 'アプリ管理' })[0]).toHaveAttribute('href', '/bgj/system/apps');
    expect(screen.getAllByRole('link', { name: '共通マスタ' })[0]).toHaveAttribute('href', '/bgj/system/settings');
  });

  it('役職マスタ・担当エリアは普段は非表示で、営業担当のトグルをクリックすると表示される', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    expect(screen.queryByText('役職マスタ')).not.toBeInTheDocument();
    expect(screen.queryByText('担当エリア')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('営業担当の詳細を開く')[0]);

    expect(screen.getAllByText('役職マスタ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('担当エリア').length).toBeGreaterThan(0);
  });

  it('担当エリアのページを開いているときは自動的に展開されている', () => {
    usePathnameMock.mockReturnValue('/bgj/master/areas');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    expect(screen.getAllByText('担当エリア').length).toBeGreaterThan(0);
    expect(screen.getAllByText('役職マスタ').length).toBeGreaterThan(0);
  });

  it('ステータスは普段は非表示で、得意先一覧のトグルをクリックすると表示される', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    expect(screen.queryByText('ステータス')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('得意先一覧の詳細を開く')[0]);

    const statusLinks = screen.getAllByRole('link', { name: 'ステータス' });
    expect(statusLinks[0]).toHaveAttribute('href', '/bgj/master/statuses');
  });

  it('マニュアルを開くと利用マニュアル・システム手順が表示され、正しいクエリ付きhrefを持つ', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    expect(screen.queryByText('利用マニュアル')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('マニュアルの詳細を開く')[0]);

    const usageLinks = screen.getAllByRole('link', { name: '利用マニュアル' });
    expect(usageLinks[0]).toHaveAttribute('href', '/bgj/manual?tab=usage&audience=bgj');
    const procedureLinks = screen.getAllByRole('link', { name: 'システム手順' });
    expect(procedureLinks[0]).toHaveAttribute('href', '/bgj/manual?tab=procedure&step=0');
  });

  it('利用マニュアルを開くと5つの対象者別リンクが表示される', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    fireEvent.click(screen.getAllByLabelText('マニュアルの詳細を開く')[0]);
    fireEvent.click(screen.getAllByLabelText('利用マニュアルの詳細を開く')[0]);

    expect(screen.getAllByRole('link', { name: 'BGJ社内の皆様へ' })[0]).toHaveAttribute(
      'href',
      '/bgj/manual?tab=usage&audience=bgj'
    );
    expect(screen.getAllByRole('link', { name: '医院様へ' })[0]).toHaveAttribute(
      'href',
      '/bgj/manual?tab=usage&audience=clinic'
    );
    expect(screen.getAllByRole('link', { name: '患者様へ' })[0]).toHaveAttribute(
      'href',
      '/bgj/manual?tab=usage&audience=patient'
    );
    expect(screen.getAllByRole('link', { name: '患者様のQR自己登録（新機能）' })[0]).toHaveAttribute(
      'href',
      '/bgj/manual?tab=usage&audience=qr-signup'
    );
    expect(screen.getAllByRole('link', { name: '全体の流れ（参考）' })[0]).toHaveAttribute(
      'href',
      '/bgj/manual?tab=usage&audience=flow'
    );
  });

  it('システム手順を開くと0〜14ステップのリンクが表示される', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    fireEvent.click(screen.getAllByLabelText('マニュアルの詳細を開く')[0]);
    fireEvent.click(screen.getAllByLabelText('システム手順の詳細を開く')[0]);

    expect(screen.getAllByRole('link', { name: '0. 全体構成' })[0]).toHaveAttribute(
      'href',
      '/bgj/manual?tab=procedure&step=0'
    );
    expect(screen.getAllByRole('link', { name: '14. システムダッシュボード' })[0]).toHaveAttribute(
      'href',
      '/bgj/manual?tab=procedure&step=14'
    );
  });

  it('?tab=procedure&step=6 の状態ではマニュアル→システム手順→該当ステップまで自動的に展開されている', () => {
    usePathnameMock.mockReturnValue('/bgj/manual');
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=procedure&step=6'));
    render(<BgjSidebar />);

    const activeLinks = screen.getAllByRole('link', { name: '6. ログインIDの自動採番' });
    expect(activeLinks.length).toBeGreaterThan(0);
    expect(activeLinks[0]).toHaveClass('bg-white/20');
  });
});
