'use client';

type ConfirmDialogTheme = 'sky' | 'violet';

type ThemeClasses = {
  panel: string;
  description: string;
  cancel: string;
  confirm: string;
};

const THEME_CLASSES: Record<ConfirmDialogTheme, ThemeClasses> = {
  sky: {
    panel: 'bg-white border border-sky-100 rounded-2xl shadow-2xl',
    description: 'text-slate-600 text-base mb-6',
    cancel:
      'flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-base font-medium transition-colors cursor-pointer',
    confirm:
      'flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-base transition-colors cursor-pointer',
  },
  violet: {
    panel: 'bg-white rounded-3xl shadow-2xl',
    description: 'text-slate-600 text-sm mb-6',
    cancel: 'flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors',
    confirm: 'flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors',
  },
};

type ConfirmDialogProps = {
  open: boolean;
  theme: ConfirmDialogTheme;
  title: string;
  description: string;
  confirmLabel?: string;
  // 削除処理等の実行中に確定ボタンの二重クリックを防ぐためのフラグ（省略時はfalse）。
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  theme,
  title,
  description,
  confirmLabel = '削除する',
  disabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  const classes = THEME_CLASSES[theme];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className={`${classes.panel} w-full max-w-sm p-6 text-center`}>
        <p className="text-slate-800 font-bold text-lg mb-2">{title}</p>
        <p className={classes.description}>{description}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className={classes.cancel}>
            キャンセル
          </button>
          <button onClick={onConfirm} disabled={disabled} className={`${classes.confirm} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
