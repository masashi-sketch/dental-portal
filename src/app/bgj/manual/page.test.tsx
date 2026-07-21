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

  it('tab=db のときはマニュアル領域内にDB定義書を表示する', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=db'));
    render(<ManualPage />);

    expect(screen.getByText('マニュアル：DB定義書')).toBeInTheDocument();
    expect(screen.getByTitle('医院向け患者注文管理 DB定義書')).toHaveAttribute(
      'src',
      '/manuals/clinic-order-db-definition.html?embed=1&v=2#overview'
    );
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

  it('利用マニュアル「BGJ社内の皆様へ」のサブタブが切り替わる', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=usage&audience=bgj'));
    render(<ManualPage />);
    expect(screen.getByText('ログインのしかた')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'マスタ管理' }));

    expect(screen.getByText('営業担当者・役職・担当エリアを管理する')).toBeInTheDocument();
    expect(screen.queryByText('ログインのしかた')).not.toBeInTheDocument();
  });

  it('利用マニュアル「医院様へ」のサブタブが切り替わる', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=usage&audience=clinic'));
    render(<ManualPage />);
    expect(screen.getByText('ログインのしかた')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '医院情報・表示設定' }));

    expect(screen.getByText('医院の基本情報・取引条件を確認する')).toBeInTheDocument();
    expect(screen.queryByText('ログインのしかた')).not.toBeInTheDocument();
  });

  it('システム手順「0. 全体構成」のサブタブが切り替わる', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=procedure&step=0'));
    render(<ManualPage />);
    expect(screen.getByText(/医院スタッフが患者様ID発行/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '認証' }));

    expect(screen.getByText(/ドメインのみ許可/)).toBeInTheDocument();
    expect(screen.queryByText(/医院スタッフが患者様ID発行/)).not.toBeInTheDocument();
  });

  it('システム手順「8. ワンクリックログイン・パスワード再設定」のサブタブが切り替わる', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=procedure&step=8'));
    render(<ManualPage />);
    expect(screen.getByText('パスワード入力なしでそのままログイン完了')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'セキュリティ設計' }));

    expect(screen.getByText(/第三者による実在アドレスへのメール爆撃/)).toBeInTheDocument();
    expect(screen.queryByText('パスワード入力なしでそのままログイン完了')).not.toBeInTheDocument();
  });

  it('システム手順「10. クリニック問い合わせ→Slack連携」のサブタブが切り替わる', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=procedure&step=10'));
    render(<ManualPage />);
    expect(screen.getByText('一方向のIncoming Webhook通知')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Slack設定手順' }));

    expect(screen.getByText('担当営業のメンション：')).toBeInTheDocument();
    expect(screen.queryByText('一方向のIncoming Webhook通知')).not.toBeInTheDocument();
  });

  it('システム手順「16. 医院スタッフのパスワードリセット」のサブタブが切り替わる', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=procedure&step=16'));
    render(<ManualPage />);
    expect(screen.getByText(/置き換えではない/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '運用変更・セキュリティ' }));

    expect(screen.getByText('前提となる運用変更：')).toBeInTheDocument();
    expect(screen.queryByText(/置き換えではない/)).not.toBeInTheDocument();
  });

  it('システム手順「17. 商品マスタと医院ごとの表示設定」のサブタブが切り替わる', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=procedure&step=17'));
    render(<ManualPage />);
    expect(screen.getByText(/商品の登録・編集・削除/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'デフォルト表示の設計' }));

    expect(screen.getByText(/医院側の手間を最小にする意図的な設計/)).toBeInTheDocument();
    expect(screen.queryByText(/商品の登録・編集・削除/)).not.toBeInTheDocument();
  });

  it('システム手順「20. BGJダッシュボード・レポートの実データ化」のサブタブが切り替わる', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=procedure&step=20'));
    render(<ManualPage />);
    expect(screen.getByText(/総得意先数・今月売上/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'CSV出力' }));

    expect(screen.getByText(/未接続のダミー/)).toBeInTheDocument();
    expect(screen.queryByText(/総得意先数・今月売上/)).not.toBeInTheDocument();
  });
});
