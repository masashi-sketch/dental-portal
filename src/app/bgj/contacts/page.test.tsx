import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BgjContactsPage from './page';

const contacts = [
  {
    id: 'c1', customer_code: 'A000001', clinic_user_id: 'u1', name: '受付 太郎', department: '受付', role_key: 'receptionist',
    email: 'taro@example.com', phone: '03-1111-2222', is_primary: true, status: 'active', notes: null, version: 1,
    deleted_at: null, created_at: '', updated_at: '', clinic: { customer_code: 'A000001', name: '中央歯科' },
    clinic_user: { id: 'u1', login_id: 'chuo-taro', status: '有効' },
    preferences: [{ contact_id: 'c1', topic: 'orders', channel: 'email', enabled: true, created_at: '', updated_at: '' }],
  },
  {
    id: 'c2', customer_code: 'A000002', clinic_user_id: 'u2', name: '院長 花子', department: null, role_key: 'dentist',
    email: 'hanako@example.com', phone: null, is_primary: false, status: 'active', notes: null, version: 1,
    deleted_at: null, created_at: '', updated_at: '', clinic: { customer_code: 'A000002', name: '青空歯科' }, clinic_user: { id: 'u2', login_id: 'A000002', status: '有効' },
    preferences: [{ contact_id: 'c2', topic: 'webinar', channel: 'email', enabled: true, created_at: '', updated_at: '' }],
  },
];

describe('BGJ担当者一覧', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ contacts, contactRoles: [
    { role_key: 'receptionist', label: '受付', sort_order: 50, created_at: '', updated_at: '' },
    { role_key: 'dentist', label: '歯科医師', sort_order: 20, created_at: '', updated_at: '' },
  ] }) })));
  afterEach(() => vi.unstubAllGlobals());

  it('得意先・担当者ID・役職・担当者・担当内容を一覧表示する', async () => {
    render(<BgjContactsPage />);
    expect(await screen.findByText('受付 太郎')).toBeInTheDocument();
    expect(screen.getByText('中央歯科')).toBeInTheDocument();
    expect(screen.getAllByText('受付').length).toBeGreaterThan(0);
    expect(screen.getByText('chuo-taro')).toBeInTheDocument();
    expect(screen.getAllByText('受注・定期購入').length).toBeGreaterThan(0);
  });

  it('担当内容と役職で絞り込める', async () => {
    render(<BgjContactsPage />);
    await screen.findByText('受付 太郎');
    fireEvent.click(screen.getByRole('button', { name: 'ウェビナー 1' }));
    await waitFor(() => expect(screen.queryByText('受付 太郎')).not.toBeInTheDocument());
    expect(screen.getByText('院長 花子')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('役職で絞り込み'), { target: { value: 'receptionist' } });
    expect(screen.getByText('条件に一致する担当者はいません')).toBeInTheDocument();
  });

  it('担当者名で検索できる', async () => {
    render(<BgjContactsPage />);
    await screen.findByText('受付 太郎');
    fireEvent.change(screen.getByLabelText('担当者を検索'), { target: { value: '花子' } });
    expect(screen.queryByText('受付 太郎')).not.toBeInTheDocument();
    expect(screen.getByText('院長 花子')).toBeInTheDocument();
  });
});
