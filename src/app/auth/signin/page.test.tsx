import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SignInPage from './page';

const signInMock = vi.fn();
const useSessionMock = vi.fn();
vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  useSession: () => useSessionMock(),
}));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('SignInPage（ポータルを選択）', () => {
  it('患者様ポータル（既定選択）でボタンを押すと、Google認証を試みず専用ログイン画面（/）へ遷移する', () => {
    signInMock.mockReset();
    pushMock.mockReset();
    useSessionMock.mockReturnValue({ data: null, status: 'unauthenticated' });
    render(<SignInPage />);

    fireEvent.click(screen.getByText('患者様ログイン画面へ →'));

    expect(pushMock).toHaveBeenCalledWith('/');
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('医院用ポータルを選んでボタンを押すと、Google認証を試みず専用ログイン画面（/clinic-login）へ遷移する', () => {
    signInMock.mockReset();
    pushMock.mockReset();
    useSessionMock.mockReturnValue({ data: null, status: 'unauthenticated' });
    render(<SignInPage />);

    fireEvent.click(screen.getByText('医院用ポータル'));
    fireEvent.click(screen.getByText('医院ログイン画面へ →'));

    expect(pushMock).toHaveBeenCalledWith('/clinic-login');
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('BGJ用ポータルを選んで未認証の場合はGoogleアカウントでログインボタンが表示され、押すとGoogle認証を開始する', () => {
    signInMock.mockReset();
    pushMock.mockReset();
    useSessionMock.mockReturnValue({ data: null, status: 'unauthenticated' });
    render(<SignInPage />);

    fireEvent.click(screen.getByText('BGJ用ポータル'));
    expect(screen.getByText('Googleアカウントでログイン')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Googleアカウントでログイン'));

    expect(signInMock).toHaveBeenCalledWith('google', { callbackUrl: '/bgj-login' });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('BGJロールで既に認証済みの場合は「入る」ボタンが表示され、押すとGoogle認証をやり直さず直接遷移する', () => {
    signInMock.mockReset();
    pushMock.mockReset();
    useSessionMock.mockReturnValue({ data: { user: { role: 'bgj' } }, status: 'authenticated' });
    render(<SignInPage />);

    fireEvent.click(screen.getByText('BGJ用ポータル'));
    const enterButton = screen.getByText('「BGJ用ポータル」に入る →');
    fireEvent.click(enterButton);

    expect(pushMock).toHaveBeenCalledWith('/bgj-login');
    expect(signInMock).not.toHaveBeenCalled();
  });
});
