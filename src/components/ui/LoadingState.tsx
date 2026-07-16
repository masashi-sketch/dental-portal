type LoadingStateProps = {
  variant?: 'inline' | 'table-row' | 'grid-cell';
  colSpan?: number;
};

export default function LoadingState({ variant = 'inline', colSpan }: LoadingStateProps) {
  if (variant === 'table-row') {
    return (
      <tr>
        <td colSpan={colSpan} className="px-5 py-8 text-center text-slate-400">
          読み込み中...
        </td>
      </tr>
    );
  }

  if (variant === 'grid-cell') {
    return <p className="text-slate-400 col-span-full text-center py-8">読み込み中...</p>;
  }

  return <p className="text-slate-400 text-sm">読み込み中...</p>;
}
