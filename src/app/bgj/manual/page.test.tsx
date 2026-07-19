import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ManualPage from './page';

const useSearchParamsMock = vi.fn(() => new URLSearchParams());
vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

describe('ManualPage', () => {
  it('パラメータなしのときは既定で「BGJ社内の皆様へ」を表示する', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    render(<ManualPage />);
    expect(screen.getByText('マニュアル：利用マニュアル')).toBeInTheDocument();
    expect(screen.getAllByText('BGJ社内の皆様へ').length).toBeGreaterThan(0);
  });

  it('tab=usage&audience=clinic のときは「医院様へ」の内容を表示する', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=usage&audience=clinic'));
    render(<ManualPage />);
    expect(
      screen.getByText('いつも当ポータルをご利用いただきありがとうございます。医院用ポータルでは、患者様IDの発行や歯周病診断の登録、ポータルの表示設定を行っていただけます。')
    ).toBeInTheDocument();
    expect(screen.queryByText('ログインのしかた')).toBeInTheDocument();
    expect(screen.queryByText('医院様（クリニック）を新しく登録する')).not.toBeInTheDocument();
  });

  it('tab=procedure&step=9 のときは「9. テストとCI」の内容を表示し、案内文が出る', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=procedure&step=9'));
    render(<ManualPage />);
    expect(screen.getByText('マニュアル：システム手順')).toBeInTheDocument();
    expect(screen.getByText('9. テストとCI')).toBeInTheDocument();
    expect(
      screen.getByText('このページは開発・運用を担当する方向けの技術手順です。医院様・患者様にご案内する内容ではありません。')
    ).toBeInTheDocument();
  });

  it('不正なstep値のときは先頭項目（0. 全体構成）にフォールバックする', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=procedure&step=99'));
    render(<ManualPage />);
    expect(screen.getByText('0. 全体構成')).toBeInTheDocument();
  });

  it('QR自己登録ページ内の孫ピルタブが引き続き機能する', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=usage&audience=qr-signup'));
    render(<ManualPage />);
    expect(screen.getByText('BGJポータルから発行する')).toBeInTheDocument();
    expect(screen.queryByText('患者様ご自身での登録手順')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('患者様のスマホでの登録'));

    expect(screen.getByText('患者様ご自身での登録手順')).toBeInTheDocument();
    expect(screen.queryByText('BGJポータルから発行する')).not.toBeInTheDocument();
  });
});
