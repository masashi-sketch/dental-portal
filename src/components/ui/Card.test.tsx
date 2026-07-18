import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from './Card';

describe('Card', () => {
  it('childrenを表示する', () => {
    render(<Card>中身</Card>);
    expect(screen.getByText('中身')).toBeInTheDocument();
  });

  it('theme未指定はviolet（border-slate-200）がデフォルト', () => {
    render(<Card data-testid="card">A</Card>);
    expect(screen.getByTestId('card').className).toContain('border-slate-200');
  });

  it('theme=skyはborder-sky-100になる（adminポータルの配色）', () => {
    render(<Card theme="sky" data-testid="card">A</Card>);
    expect(screen.getByTestId('card').className).toContain('border-sky-100');
  });

  it('classNameを追記できる', () => {
    render(<Card className="p-5" data-testid="card">A</Card>);
    expect(screen.getByTestId('card').className).toContain('p-5');
  });
});
