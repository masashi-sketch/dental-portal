import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BgjHeader from './BgjHeader';

describe('BgjHeader', () => {
  it('患者様ポータル・医院用ポータルへのリンクを表示する', () => {
    render(<BgjHeader />);

    expect(screen.getByRole('link', { name: /患者様ポータル/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /医院用ポータル/ })).toHaveAttribute('href', '/admin');
  });
});
