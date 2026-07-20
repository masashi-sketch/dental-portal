import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductVisual from './ProductVisual';

describe('ProductVisual', () => {
  it('image_typeに応じたグラデーション背景を描画する', () => {
    render(<ProductVisual type="supplement" />);
    const el = screen.getByTestId('product-visual');
    // jsdomはhex（#6366f1）をrgbに変換して保持する
    expect(el.style.background).toContain('linear-gradient');
    expect(el.style.background).toContain('rgb(99, 102, 241)');
  });

  it('未知のtypeはoralにフォールバックする（描画が壊れない）', () => {
    render(<ProductVisual type="unknown-type" />);
    const el = screen.getByTestId('product-visual');
    expect(el.style.background).toContain('rgb(16, 185, 129)');
  });

  it('classNameを差し替えられる（詳細ページの大きい表示用）', () => {
    render(<ProductVisual type="yogurt" className="h-64 rounded-2xl" />);
    expect(screen.getByTestId('product-visual').className).toBe('h-64 rounded-2xl');
  });

  it('imageUrlが指定されている場合は実画像の<img>を描画する（グラデーションは使わない）', () => {
    render(<ProductVisual type="supplement" imageUrl="https://example.supabase.co/storage/v1/object/public/product-images/a.png" />);
    const el = screen.getByTestId('product-visual');
    expect(el.tagName).toBe('IMG');
    expect(el.getAttribute('src')).toBe('https://example.supabase.co/storage/v1/object/public/product-images/a.png');
  });

  it('imageUrlがnull/未指定の場合は従来通りグラデーション表示になる', () => {
    render(<ProductVisual type="supplement" imageUrl={null} />);
    const el = screen.getByTestId('product-visual');
    expect(el.tagName).toBe('DIV');
    expect(el.style.background).toContain('linear-gradient');
  });
});
