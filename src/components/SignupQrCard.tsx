'use client';

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Button from '@/components/ui/Button';
import { exportElementAsPdf } from '@/lib/exportElementAsPdf';

type Props = {
  clinicName: string;
  signupPin: string;
  signupPinIssuedAt: string;
  qrValue: string;
  pdfFilename: string;
  theme?: 'sky' | 'violet';
};

// 患者様のQR + 受付PIN + 発行日時 + 登録URLの表示と、PDFダウンロードをひとまとめにした
// カード。BGJポータルの得意先詳細「接続情報」タブ、医院ポータルの「患者様管理」QRモーダル・
// 「QR設定」ページの3箇所から使う（3箇所目を追加する際に共通化した）。
export default function SignupQrCard({ clinicName, signupPin, signupPinIssuedAt, qrValue, pdfFilename, theme = 'sky' }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const boxClass = theme === 'violet' ? 'bg-violet-50 border-violet-200' : 'bg-sky-50 border-sky-200';
  const urlTextClass = theme === 'violet' ? 'text-violet-700' : 'text-sky-700';

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportElementAsPdf(cardRef.current, pdfFilename);
    } catch {
      setExportError('PDFの作成に失敗しました');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div ref={cardRef} className="bg-white p-2">
        <p className="text-sm font-bold text-slate-800 mb-4">{clinicName}</p>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="border-2 border-slate-100 rounded-2xl p-3 inline-block shadow-sm self-start">
            <QRCodeSVG value={qrValue} size={160} />
          </div>
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">受付PIN</p>
              <p className="text-2xl font-bold text-slate-800 font-mono tracking-widest">{signupPin}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">発行日時</p>
              <p className="text-sm text-slate-600 font-mono">{signupPinIssuedAt || '—'}</p>
            </div>
            <div className={`${boxClass} border rounded-xl px-4 py-3`}>
              <p className="text-xs text-slate-500 mb-1 font-medium">登録URL（コピーして送付も可）</p>
              <p className={`text-xs ${urlTextClass} font-mono break-all`}>{qrValue}</p>
            </div>
          </div>
        </div>
      </div>
      {exportError && <p className="text-red-600 text-xs">{exportError}</p>}
      <Button theme={theme} size="sm" onClick={handleExport} disabled={exporting}>
        {exporting ? '作成中...' : 'PDFをダウンロード'}
      </Button>
    </div>
  );
}
