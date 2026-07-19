import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SalesRepAvatar from './SalesRepAvatar';

describe('SalesRepAvatar', () => {
  it('photoUrlがあれば画像を表示する', () => {
    render(<SalesRepAvatar name="山田太郎" photoUrl="https://example.com/photo.jpg" />);
    expect(screen.getByRole('img', { name: '山田太郎' })).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('photoUrlが無ければ名前の頭文字をイニシャル表示する', () => {
    render(<SalesRepAvatar name="山田太郎" photoUrl={null} />);
    expect(screen.getByText('山')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('画像の読み込みに失敗したらイニシャル表示にフォールバックする', () => {
    render(<SalesRepAvatar name="山田太郎" photoUrl="https://example.com/broken.jpg" />);
    const img = screen.getByRole('img', { name: '山田太郎' });
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('山')).toBeInTheDocument();
  });

  it('photoUrlが変わったら読み込みエラー状態をリセットして再度画像表示を試みる', () => {
    const { rerender } = render(<SalesRepAvatar name="山田太郎" photoUrl="https://example.com/broken.jpg" />);
    fireEvent.error(screen.getByRole('img', { name: '山田太郎' }));
    expect(screen.getByText('山')).toBeInTheDocument();

    rerender(<SalesRepAvatar name="佐藤花子" photoUrl="https://example.com/new.jpg" />);
    expect(screen.getByRole('img', { name: '佐藤花子' })).toHaveAttribute('src', 'https://example.com/new.jpg');
  });
});
