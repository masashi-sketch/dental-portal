'use client';

// jspdf・html2canvas-proはこの関数が呼ばれたとき（クリックのタイミング）にのみ
// 動的importで読み込む。QRカードのPDF化以外では使わない重いライブラリのため、
// 各ページの初期バンドルには含めない。
// html2canvas（無印）はTailwind v4のoklchカラー関数を解釈できずエラーになるため、
// 対応済みのフォークであるhtml2canvas-proを使う。
export async function exportElementAsPdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}
