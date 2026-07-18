import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('childrenを表示し、クリックでonClickが呼ばれる', () => {
    const onClick = vi.fn();
    render(<Button theme="violet" onClick={onClick}>保存する</Button>);
    const button = screen.getByRole('button', { name: '保存する' });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('themeに応じた配色クラスが付く', () => {
    const { rerender } = render(<Button theme="violet">A</Button>);
    expect(screen.getByRole('button').className).toContain('bg-violet-600');
    rerender(<Button theme="sky">A</Button>);
    expect(screen.getByRole('button').className).toContain('bg-sky-500');
  });

  it('sizeはlgがデフォルトで、smを指定すると小さいパディングになる', () => {
    const { rerender } = render(<Button theme="violet">A</Button>);
    expect(screen.getByRole('button').className).toContain('px-5 py-3');
    rerender(<Button theme="violet" size="sm">A</Button>);
    expect(screen.getByRole('button').className).toContain('px-4 py-2.5');
  });

  it('fullWidthでflex-1が付き、classNameは追記できる', () => {
    render(<Button theme="violet" fullWidth className="shadow-sm">A</Button>);
    const className = screen.getByRole('button').className;
    expect(className).toContain('flex-1');
    expect(className).toContain('shadow-sm');
  });

  it('disabledのとき押せない', () => {
    const onClick = vi.fn();
    render(<Button theme="violet" disabled onClick={onClick}>A</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('iconをchildrenの前に描画する', () => {
    render(<Button theme="violet" icon={<span data-testid="icon" />}>A</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
