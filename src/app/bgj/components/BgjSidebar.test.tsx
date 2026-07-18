import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BgjSidebar from './BgjSidebar';

const usePathnameMock = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: '山田太郎', email: 'yamada@biogaia.jp' } } }),
  signOut: vi.fn(),
}));

describe('BgjSidebar', () => {
  it('マスタ・システム管理・ヘルプの各グループラベルとLINKマスタへのリンクを表示する', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    render(<BgjSidebar />);
    const labels = screen.getAllByText('マスタ');
    expect(labels.length).toBeGreaterThan(0);
    expect(screen.getAllByText('システム管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ヘルプ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LINKマスタ').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /LINKマスタ/ })[0]).toHaveAttribute('href', '/bgj/master/links');
  });

  it('役職マスタ・担当エリアは普段は非表示で、営業担当のトグルをクリックすると表示される', () => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    render(<BgjSidebar />);
    expect(screen.queryByText('役職マスタ')).not.toBeInTheDocument();
    expect(screen.queryByText('担当エリア')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('営業担当の詳細を開く')[0]);

    expect(screen.getAllByText('役職マスタ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('担当エリア').length).toBeGreaterThan(0);
  });

  it('担当エリアのページを開いているときは自動的に展開されている', () => {
    usePathnameMock.mockReturnValue('/bgj/master/areas');
    render(<BgjSidebar />);
    expect(screen.getAllByText('担当エリア').length).toBeGreaterThan(0);
    expect(screen.getAllByText('役職マスタ').length).toBeGreaterThan(0);
  });
});
