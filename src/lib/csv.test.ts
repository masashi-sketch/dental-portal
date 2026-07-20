import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadCsv, toCsvString } from './csv';

type Row = { name: string; amount: number; memo: string };

describe('toCsvString', () => {
  it('見出し行と各列をカンマ区切りで組み立てる', () => {
    const rows: Row[] = [{ name: 'サンプル歯科', amount: 5000, memo: '' }];
    const csv = toCsvString(rows, [
      { key: 'name', label: '医院名' },
      { key: 'amount', label: '金額' },
      { key: 'memo', label: 'メモ' },
    ]);
    expect(csv).toBe('医院名,金額,メモ\r\nサンプル歯科,5000,');
  });

  it('カンマ・ダブルクォート・改行を含む値をRFC4180準拠でエスケープする', () => {
    const rows: Row[] = [{ name: 'A,B "医院"', amount: 1000, memo: '1行目\n2行目' }];
    const csv = toCsvString(rows, [
      { key: 'name', label: '医院名' },
      { key: 'amount', label: '金額' },
      { key: 'memo', label: 'メモ' },
    ]);
    expect(csv).toBe('医院名,金額,メモ\r\n"A,B ""医院""",1000,"1行目\n2行目"');
  });

  it('null・undefinedは空文字として出力する', () => {
    const rows = [{ name: 'A', amount: null, memo: undefined }] as unknown as Row[];
    const csv = toCsvString(rows, [
      { key: 'name', label: '医院名' },
      { key: 'amount', label: '金額' },
      { key: 'memo', label: 'メモ' },
    ]);
    expect(csv).toBe('医院名,金額,メモ\r\nA,,');
  });

  it('行が0件でも見出し行のみを返す', () => {
    const csv = toCsvString<Row>([], [{ key: 'name', label: '医院名' }]);
    expect(csv).toBe('医院名');
  });
});

describe('downloadCsv', () => {
  const createObjectURLMock = vi.fn<(blob: Blob) => string>(() => 'blob:mock-url');
  const revokeObjectURLMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: createObjectURLMock, revokeObjectURL: revokeObjectURLMock });
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('UTF-8 BOM付きのBlobを生成し、ダウンロード用の<a>要素をクリックしてから片付ける', () => {
    downloadCsv('report.csv', 'a,b\r\n1,2');

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const blob = createObjectURLMock.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8;');
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
    expect(document.body.querySelector('a[download="report.csv"]')).not.toBeInTheDocument();
  });
});
