import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ManualNav from './ManualNav';

const usePathnameMock = vi.fn();
const useSearchParamsMock = vi.fn(() => new URLSearchParams());
vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useSearchParams: () => useSearchParamsMock(),
}));

describe('ManualNav', () => {
  it('利用マニュアル・システム手順・DB定義書が表示され、正しいクエリ付きhrefを持つ', () => {
    usePathnameMock.mockReturnValue('/bgj/manual');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<ManualNav />);

    const usageLinks = screen.getAllByRole('link', { name: '利用マニュアル' });
    expect(usageLinks[0]).toHaveAttribute('href', '/bgj/manual?tab=usage&audience=bgj');
    const procedureLinks = screen.getAllByRole('link', { name: 'システム手順' });
    expect(procedureLinks[0]).toHaveAttribute('href', '/bgj/manual?tab=procedure&step=0');
    expect(screen.getByRole('link', { name: 'DB定義書' })).toHaveAttribute('href', '/bgj/manual?tab=db');
  });

  it('利用マニュアルを開くと5つの対象者別リンクが表示される', () => {
    usePathnameMock.mockReturnValue('/bgj/manual');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<ManualNav />);
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

  it('システム手順を開くと0〜15ステップのリンクが表示される', () => {
    usePathnameMock.mockReturnValue('/bgj/manual');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<ManualNav />);
    fireEvent.click(screen.getAllByLabelText('システム手順の詳細を開く')[0]);

    expect(screen.getAllByRole('link', { name: '0. 全体構成' })[0]).toHaveAttribute(
      'href',
      '/bgj/manual?tab=procedure&step=0'
    );
    expect(screen.getAllByRole('link', { name: '15. BGJ患者一覧' })[0]).toHaveAttribute(
      'href',
      '/bgj/manual?tab=procedure&step=15'
    );
  });

  it('?tab=procedure&step=6 の状態ではシステム手順→該当ステップまで自動的に展開されている', () => {
    usePathnameMock.mockReturnValue('/bgj/manual');
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=procedure&step=6'));
    render(<ManualNav />);

    const activeLinks = screen.getAllByRole('link', { name: '6. ログインIDの自動採番' });
    expect(activeLinks.length).toBeGreaterThan(0);
    expect(activeLinks[0]).toHaveClass('bg-violet-50');
  });
});
