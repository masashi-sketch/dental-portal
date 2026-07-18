import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BgjSidebar from './BgjSidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/bgj/dashboard',
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: '山田太郎', email: 'yamada@biogaia.jp' } } }),
  signOut: vi.fn(),
}));

describe('BgjSidebar', () => {
  it('マスタ・システム管理・ヘルプの各グループラベルとLINKマスタへのリンクを表示する', () => {
    render(<BgjSidebar />);
    const labels = screen.getAllByText('マスタ');
    expect(labels.length).toBeGreaterThan(0);
    expect(screen.getAllByText('システム管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ヘルプ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LINKマスタ').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /LINKマスタ/ })[0]).toHaveAttribute('href', '/bgj/master/links');
  });
});
