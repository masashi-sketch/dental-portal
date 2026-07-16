// ISO日時文字列を yyyymmddhhmmss 形式（ローカルタイム）に変換する。
// QRコードの発行日時表示など、簡潔な数字の羅列で見せたい箇所向け。
export function formatTimestampCompact(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    String(d.getFullYear()) +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}
