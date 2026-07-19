import type { ClinicStatusColor } from '@/lib/supabase/types';

// clinic_statuses.colorはTailwindの動的クラス名生成を避けるため固定候補の
// CHECK制約になっている。ここで静的なクラス名マップに変換する
// （得意先一覧・得意先詳細・ステータスマスタ管理画面の3箇所で共通利用）。
export const CLINIC_STATUS_BADGE_CLASS: Record<ClinicStatusColor, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  sky: 'bg-sky-100 text-sky-700',
  violet: 'bg-violet-100 text-violet-700',
  slate: 'bg-slate-100 text-slate-700',
};

export const CLINIC_STATUS_COLOR_OPTIONS: { value: ClinicStatusColor; label: string }[] = [
  { value: 'emerald', label: '緑（emerald）' },
  { value: 'amber', label: '黄（amber）' },
  { value: 'red', label: '赤（red）' },
  { value: 'sky', label: '青（sky）' },
  { value: 'violet', label: '紫（violet）' },
  { value: 'slate', label: 'グレー（slate）' },
];
