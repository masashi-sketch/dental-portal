import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

const baseProps = {
  theme: 'violet' as const,
  title: '削除しますか？',
  description: 'この操作は取り消せません。',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ConfirmDialog', () => {
  it('open=falseのときは何も描画しない', () => {
    render(<ConfirmDialog {...baseProps} open={false} />);
    expect(screen.queryByText('削除しますか？')).not.toBeInTheDocument();
  });

  it('open=trueでタイトル・説明・ボタンを表示する（確定ラベルのデフォルトは「削除する」）', () => {
    render(<ConfirmDialog {...baseProps} open />);
    expect(screen.getByText('削除しますか？')).toBeInTheDocument();
    expect(screen.getByText('この操作は取り消せません。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除する' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
  });

  it('confirmLabelで確定ボタンの文言を変えられる', () => {
    render(<ConfirmDialog {...baseProps} open confirmLabel="再発行する" />);
    expect(screen.getByRole('button', { name: '再発行する' })).toBeInTheDocument();
  });

  it('確定・キャンセルそれぞれのコールバックが呼ばれる', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} open onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disabled=trueのとき確定ボタンが無効化される（二重クリック防止）', () => {
    render(<ConfirmDialog {...baseProps} open disabled />);
    expect(screen.getByRole('button', { name: '削除する' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'キャンセル' })).not.toBeDisabled();
  });

  it('themeでパネルの見た目が変わる（sky=rounded-2xl+border、violet=rounded-3xl）', () => {
    const { rerender } = render(<ConfirmDialog {...baseProps} open theme="sky" />);
    expect(screen.getByText('削除しますか？').parentElement?.className).toContain('border-sky-100');
    rerender(<ConfirmDialog {...baseProps} open theme="violet" />);
    expect(screen.getByText('削除しますか？').parentElement?.className).toContain('rounded-3xl');
  });
});
