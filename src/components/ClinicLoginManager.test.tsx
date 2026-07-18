import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClinicLoginManager from './ClinicLoginManager';
import type { ClinicUserPublic } from '@/lib/supabase/types';

const existingUser: ClinicUserPublic = {
  id: 'u1',
  customer_code: 'A000001',
  login_id: 'chuo-shika',
  name: null,
  status: '有効',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

describe('ClinicLoginManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url !== '/api/bgj/clinics/A000001/user') throw new Error(`unexpected fetch: ${url}`);
      if (!init?.method) return jsonResponse({ clinicUsers: [existingUser] });
      if (init.method === 'POST') {
        const body = JSON.parse(init.body as string);
        return jsonResponse({
          clinicUser: { ...existingUser, id: 'u2', login_id: body.loginId, name: body.name || null },
        });
      }
      if (init.method === 'PATCH') {
        const body = JSON.parse(init.body as string);
        return jsonResponse({
          clinicUser: { ...existingUser, ...(body.status ? { status: body.status } : {}) },
        });
      }
      throw new Error(`unexpected method: ${init.method}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('マウント時にログイン一覧を取得して表示する（名前未設定は代替文言）', async () => {
    render(<ClinicLoginManager customerCode="A000001" />);
    expect(await screen.findByText('chuo-shika')).toBeInTheDocument();
    expect(screen.getByText('担当者名未設定')).toBeInTheDocument();
    expect(screen.getByText('有効')).toBeInTheDocument();
  });

  it('defaultNameが担当者名の初期値に入る', async () => {
    render(<ClinicLoginManager customerCode="A000001" defaultName="営業太郎" />);
    await screen.findByText('chuo-shika');
    expect(screen.getByDisplayValue('営業太郎')).toBeInTheDocument();
  });

  it('ID・パスワード未入力で「発行する」を押すと警告し、POSTしない', async () => {
    render(<ClinicLoginManager customerCode="A000001" />);
    await screen.findByText('chuo-shika');
    fireEvent.click(screen.getByRole('button', { name: '発行する' }));
    expect(await screen.findByText('ログインIDと初期パスワードを入力してください')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit)?.method === 'POST')).toHaveLength(0);
  });

  it('入力して「発行する」を押すとPOSTし、一覧の先頭に追加される', async () => {
    render(<ClinicLoginManager customerCode="A000001" />);
    await screen.findByText('chuo-shika');
    const [loginIdInput, passwordInput] = screen.getAllByRole('textbox');
    fireEvent.change(loginIdInput, { target: { value: 'minami-dental' } });
    fireEvent.change(passwordInput, { target: { value: 'initpass123' } });
    fireEvent.click(screen.getByRole('button', { name: '発行する' }));
    expect(await screen.findByText('ログインを発行しました')).toBeInTheDocument();
    expect(screen.getByText('minami-dental')).toBeInTheDocument();
    expect(screen.getByText('chuo-shika')).toBeInTheDocument(); // 既存行は残る（楽観的更新）
  });

  it('「無効化する」でPATCHし、ステータス表示が切り替わる', async () => {
    render(<ClinicLoginManager customerCode="A000001" />);
    await screen.findByText('chuo-shika');
    fireEvent.click(screen.getByRole('button', { name: '無効化する' }));
    expect(await screen.findByText('無効化しました')).toBeInTheDocument();
    expect(screen.getByText('無効')).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({ id: 'u1', status: '無効' });
  });

  it('「パスワード再設定」で入力欄が開き、確定でPATCHする', async () => {
    render(<ClinicLoginManager customerCode="A000001" />);
    await screen.findByText('chuo-shika');
    fireEvent.click(screen.getByRole('button', { name: 'パスワード再設定' }));
    fireEvent.change(screen.getByPlaceholderText('新しいパスワード'), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByRole('button', { name: '確定' }));
    expect(await screen.findByText('パスワードを再設定しました')).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({ id: 'u1', password: 'newpass123' });
  });
});
