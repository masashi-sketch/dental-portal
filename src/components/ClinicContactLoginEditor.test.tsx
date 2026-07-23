import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClinicContactLoginEditor from './ClinicContactLoginEditor';
import type { ClinicContact, ClinicUserWithRole } from '@/lib/supabase/types';

const contact = {
  id: 'contact-1', customer_code: 'A000001', clinic_user_id: 'user-1', name: '受付 太郎',
  department: '受付', role_key: 'receptionist', email: 'contact@example.com', phone: '03-1234-5678',
  is_primary: true, status: 'active', notes: null, version: 1, deleted_at: null,
  created_at: '', updated_at: '', preferences: [],
} as ClinicContact;

const createdUser = {
  id: 'user-1', customer_code: 'A000001', login_id: 'A000001', name: '受付 太郎',
  email: 'contact@example.com', status: '有効', created_at: '', updated_at: '', role_key: 'admin',
} as ClinicUserWithRole;

describe('ClinicContactLoginEditor', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('既存ログインの変更では空のパスワードを送らない', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ clinicUser: createdUser }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<ClinicContactLoginEditor contact={{ ...contact, clinic_user_id: createdUser.id }} clinicUser={createdUser} onSaved={async () => {}} onClose={() => {}} />);

    expect(screen.getByLabelText('担当者ID')).toHaveValue('A000001');
    fireEvent.click(screen.getByRole('button', { name: '認証設定を保存' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({ status: '有効', roleKey: 'admin' });
    expect(body).not.toHaveProperty('loginId');
    expect(body).not.toHaveProperty('password');
  });
});
