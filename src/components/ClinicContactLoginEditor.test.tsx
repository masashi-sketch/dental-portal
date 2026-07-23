import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClinicContactLoginEditor from './ClinicContactLoginEditor';
import type { ClinicContact, ClinicUserPublic } from '@/lib/supabase/types';

const contact = {
  id: 'contact-1', customer_code: 'A000001', clinic_user_id: null, name: '受付 太郎',
  department: '受付', title: null, email: 'contact@example.com', phone: '03-1234-5678',
  is_primary: true, status: 'active', notes: null, version: 1, deleted_at: null,
  created_at: '', updated_at: '', preferences: [],
} as ClinicContact;

const createdUser = {
  id: 'user-1', customer_code: 'A000001', login_id: 'chuo-taro', name: '受付 太郎',
  email: 'contact@example.com', status: '有効', created_at: '', updated_at: '',
} as ClinicUserPublic;

describe('ClinicContactLoginEditor', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('担当者から医院ログインを発行して関連付け処理へ渡す', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ clinicUser: createdUser }) });
    vi.stubGlobal('fetch', fetchMock);
    const onSaved = vi.fn(async () => {});
    const onClose = vi.fn();
    render(<ClinicContactLoginEditor customerCode="A000001" contact={contact} clinicUser={null} onSaved={onSaved} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('ログインID *'), { target: { value: 'chuo-taro' } });
    fireEvent.change(screen.getByLabelText(/^初期パスワード/), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログインを発行' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(createdUser));
    expect(fetchMock).toHaveBeenCalledWith('/api/bgj/clinics/A000001/user', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({ loginId: 'chuo-taro', password: 'password123', name: '受付 太郎' });
    expect(onClose).toHaveBeenCalled();
  });

  it('既存ログインの変更では空のパスワードを送らない', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ clinicUser: createdUser }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<ClinicContactLoginEditor customerCode="A000001" contact={{ ...contact, clinic_user_id: createdUser.id }} clinicUser={createdUser} onSaved={async () => {}} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('ログインID *'), { target: { value: 'chuo-taro-2' } });
    fireEvent.click(screen.getByRole('button', { name: '変更を保存' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({ id: 'user-1', loginId: 'chuo-taro-2', status: '有効' });
    expect(body).not.toHaveProperty('password');
  });
});
