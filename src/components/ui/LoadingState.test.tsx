import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingState from './LoadingState';

describe('LoadingState', () => {
  it('デフォルト（inline）は段落で「読み込み中...」を表示する', () => {
    render(<LoadingState />);
    const p = screen.getByText('読み込み中...');
    expect(p.tagName).toBe('P');
  });

  it('variant=table-rowはtr/tdで描画され、colSpanが効く', () => {
    render(
      <table>
        <tbody>
          <LoadingState variant="table-row" colSpan={5} />
        </tbody>
      </table>,
    );
    const cell = screen.getByText('読み込み中...');
    expect(cell.tagName).toBe('TD');
    expect(cell).toHaveAttribute('colspan', '5');
  });

  it('variant=grid-cellはcol-span-fullの段落で描画される', () => {
    render(<LoadingState variant="grid-cell" />);
    expect(screen.getByText('読み込み中...').className).toContain('col-span-full');
  });
});
