export type CsvColumn<T> = { key: keyof T; label: string };

const UTF8_BOM = '﻿';

// RFC4180準拠のエスケープ（カンマ・ダブルクォート・改行を含む値は"..."で囲む）。
function escapeCsvField(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function toCsvString<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvField(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCsvField(row[c.key])).join(','));
  return [header, ...body].join('\r\n');
}

// Excelで開いたときの日本語文字化けを防ぐため、UTF-8 BOMを先頭に付与する。
export function downloadCsv(filename: string, csvString: string): void {
  const blob = new Blob([UTF8_BOM + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
