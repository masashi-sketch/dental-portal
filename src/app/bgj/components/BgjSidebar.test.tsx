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
  it('マスタ・受発注管理・在庫管理・請求管理・ウェビナー管理・システム管理・ヘルプの各グループラベルを表示する', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    const labels = screen.getAllByText('マスタ');
    expect(labels.length).toBeGreaterThan(0);
    expect(screen.getAllByText('受発注管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('在庫管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('請求管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ウェビナー管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('システム管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ヘルプ').length).toBeGreaterThan(0);
    expect(screen.queryByText('LINKマスタ')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('マスタを開く')[0]);

    expect(screen.getAllByText('LINKマスタ').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /LINKマスタ/ })[0]).toHaveAttribute('href', '/bgj/master/links');
  });

  it('ウェビナー管理を開くとウェビナー一覧を表示する', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    fireEvent.click(screen.getAllByLabelText('ウェビナー管理を開く')[0]);
    expect(screen.getAllByRole('link', { name: 'ウェビナー一覧' })[0]).toHaveAttribute('href', '/bgj/webinars');
  });

  it('受発注管理と在庫管理を開くと各メニューを表示する', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);

    expect(screen.queryByText('受注一覧')).not.toBeInTheDocument();
    expect(screen.queryByText('在庫一覧')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('受発注管理を開く')[0]);
    fireEvent.click(screen.getAllByLabelText('在庫管理を開く')[0]);

    expect(screen.getAllByRole('link', { name: '受注一覧' })[0]).toHaveAttribute('href', '/bgj/orders?view=received');
    expect(screen.getAllByRole('link', { name: '発注一覧' })[0]).toHaveAttribute('href', '/bgj/orders?view=purchase');
    expect(screen.getAllByRole('link', { name: '定期購入申込' })[0]).toHaveAttribute('href', '/bgj/orders?view=subscriptions');
    expect(screen.getAllByRole('link', { name: '在庫一覧' })[0]).toHaveAttribute('href', '/bgj/inventory?view=stock');
    expect(screen.getAllByRole('link', { name: '入出庫履歴' })[0]).toHaveAttribute('href', '/bgj/inventory?view=movements');
  });

  it('請求管理は普段は非表示で、トグルをクリックすると請求一覧を表示する', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);

    expect(screen.queryByText('請求一覧')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('請求管理を開く')[0]);

    expect(screen.getAllByRole('link', { name: '請求一覧' })[0]).toHaveAttribute('href', '/bgj/billing');
  });

  it('システム管理グループの先頭にシステムダッシュボードへのリンクを表示する', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    fireEvent.click(screen.getAllByLabelText('システム管理を開く')[0]);
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

    fireEvent.click(screen.getAllByLabelText('システム管理を開く')[0]);
    fireEvent.click(screen.getAllByLabelText('システムダッシュボードの詳細を開く')[0]);

    expect(screen.getAllByRole('link', { name: 'DB管理' })[0]).toHaveAttribute('href', '/bgj/system/db');
    expect(screen.getAllByRole('link', { name: 'アプリ管理' })[0]).toHaveAttribute('href', '/bgj/system/apps');
    expect(screen.getAllByRole('link', { name: '共通マスタ' })[0]).toHaveAttribute('href', '/bgj/system/settings');
  });

  it('得意先一覧の下・営業担当の上に患者一覧へのリンクを表示する', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    fireEvent.click(screen.getAllByLabelText('マスタを開く')[0]);
    expect(screen.getAllByRole('link', { name: '患者一覧' })[0]).toHaveAttribute('href', '/bgj/patients');
  });

  it('役職マスタ・担当エリアは普段は非表示で、営業担当のトグルをクリックすると表示される', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    expect(screen.queryByText('役職マスタ')).not.toBeInTheDocument();
    expect(screen.queryByText('担当エリア')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('マスタを開く')[0]);
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

    fireEvent.click(screen.getAllByLabelText('マスタを開く')[0]);
    fireEvent.click(screen.getAllByLabelText('得意先一覧の詳細を開く')[0]);

    const statusLinks = screen.getAllByRole('link', { name: 'ステータス' });
    expect(statusLinks[0]).toHaveAttribute('href', '/bgj/master/statuses');
  });

  it('マニュアルは単純なリンクとして表示される（子ツリーはManualNavへ移した）', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);
    expect(screen.queryByRole('link', { name: 'マニュアル' })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('ヘルプを開く')[0]);

    expect(screen.getAllByRole('link', { name: 'マニュアル' })[0]).toHaveAttribute('href', '/bgj/manual');
    expect(screen.queryByLabelText('マニュアルの詳細を開く')).not.toBeInTheDocument();
    expect(screen.queryByText('利用マニュアル')).not.toBeInTheDocument();
  });

  it('マニュアル画面ではヘルプグループが自動的に展開される', () => {
    usePathnameMock.mockReturnValue('/bgj/manual');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<BgjSidebar />);

    expect(screen.getAllByRole('link', { name: 'マニュアル' })[0]).toHaveAttribute('href', '/bgj/manual');
    expect(screen.getAllByLabelText('ヘルプを閉じる').length).toBeGreaterThan(0);
  });
});
