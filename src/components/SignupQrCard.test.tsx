// PDFエクスポート（jspdf/html2canvas-pro経由）はjsdomの<canvas>で動かないため、
// exportElementAsPdf自体をmockし、呼び出しと成功/失敗時の表示切り替えのみ検証する。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SignupQrCard from './SignupQrCard';
import { exportElementAsPdf } from '@/lib/exportElementAsPdf';

vi.mock('@/lib/exportElementAsPdf', () => ({
  exportElementAsPdf: vi.fn(),
}));

const exportMock = vi.mocked(exportElementAsPdf);

const baseProps = {
  clinicName: '中央歯科クリニック',
  signupPin: '482910',
  signupPinIssuedAt: '2026-07-01 10:00',
  qrValue: 'https://dental-portal-biogaia.vercel.app/join/abc123/mobile',
  pdfFilename: '中央歯科クリニック_QR.pdf',
};

describe('SignupQrCard', () => {
  beforeEach(() => {
    exportMock.mockReset();
  });

  it('propsどおりに医院名・PIN・発行日時・登録URLとQRコードを表示する', () => {
    const { container } = render(<SignupQrCard {...baseProps} />);
    expect(screen.getByText('中央歯科クリニック')).toBeInTheDocument();
    expect(screen.getByText('482910')).toBeInTheDocument();
    expect(screen.getByText('2026-07-01 10:00')).toBeInTheDocument();
    expect(screen.getByText(baseProps.qrValue)).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('発行日時が空文字のときは「—」を表示する', () => {
    render(<SignupQrCard {...baseProps} signupPinIssuedAt="" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('PDFダウンロードクリックでexportElementAsPdfが呼ばれ、実行中はボタンが無効化され成功後に元に戻る', async () => {
    exportMock.mockResolvedValueOnce(undefined);
    render(<SignupQrCard {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'PDFをダウンロード' }));
    expect(screen.getByRole('button', { name: '作成中...' })).toBeDisabled();

    expect(await screen.findByRole('button', { name: 'PDFをダウンロード' })).not.toBeDisabled();
    expect(exportMock).toHaveBeenCalledWith(expect.any(HTMLElement), baseProps.pdfFilename);
    expect(screen.queryByText('PDFの作成に失敗しました')).not.toBeInTheDocument();
  });

  it('エクスポート失敗時はエラーメッセージを表示し、ボタンは操作可能に戻る', async () => {
    exportMock.mockRejectedValueOnce(new Error('canvas error'));
    render(<SignupQrCard {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'PDFをダウンロード' }));

    expect(await screen.findByText('PDFの作成に失敗しました')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDFをダウンロード' })).not.toBeDisabled();
  });
});
