import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StaffMasterPage from './page';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const rep = {
  id: 'rep-1',
  name: '山田太郎',
  role_id: 'role-1',
  area_id: 'area-1',
  phone: '090-0000-0000',
  email: 'yamada@biogaia.jp',
  photo_url: null,
  slack_user_id: 'U0123ABCD',
  created_at: '',
  updated_at: '',
  role: { id: 'role-1', name: '営業', created_at: '', updated_at: '' },
  area: { id: 'area-1', name: '東京都', created_at: '', updated_at: '' },
};

const repWithoutSlack = { ...rep, id: 'rep-2', name: '佐藤花子', slack_user_id: null };

describe('StaffMasterPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/bgj/sales-reps') return jsonResponse({ salesReps: [rep, repWithoutSlack] });
      if (url === '/api/bgj/staff-roles') return jsonResponse({ staffRoles: [rep.role] });
      if (url === '/api/bgj/staff-areas') return jsonResponse({ staffAreas: [rep.area] });
      if (url === '/api/bgj/clinics') return jsonResponse({ clinics: [{ staff: { id: 'rep-1' }, month_sales: 50000 }] });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('営業担当者を一覧（テーブル）で表示する', async () => {
    render(<StaffMasterPage />);
    expect(await screen.findByText('山田太郎')).toBeInTheDocument();
    expect(screen.getAllByText('東京都').length).toBe(2);
    expect(screen.getAllByText('090-0000-0000').length).toBe(2);
    expect(screen.getByText('¥50,000')).toBeInTheDocument();
  });

  it('Slackユーザーidの有無でバッジ表示が切り替わる', async () => {
    render(<StaffMasterPage />);
    await screen.findByText('山田太郎');
    expect(screen.getByText('設定済み')).toBeInTheDocument();
    expect(screen.getByText('未設定')).toBeInTheDocument();
  });

  it('編集ボタンから既存データがモーダルに反映される', async () => {
    render(<StaffMasterPage />);
    await screen.findByText('山田太郎');
    fireEvent.click(screen.getAllByText('編集')[0]);
    expect(await screen.findByDisplayValue('山田太郎')).toBeInTheDocument();
    expect(screen.getByDisplayValue('090-0000-0000')).toBeInTheDocument();
  });

  it('削除確認ダイアログから削除できる', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/bgj/sales-reps' && !init) return jsonResponse({ salesReps: [rep, repWithoutSlack] });
      if (url === '/api/bgj/staff-roles') return jsonResponse({ staffRoles: [rep.role] });
      if (url === '/api/bgj/staff-areas') return jsonResponse({ staffAreas: [rep.area] });
      if (url === '/api/bgj/clinics') return jsonResponse({ clinics: [] });
      if (url === '/api/bgj/sales-reps/rep-1' && init?.method === 'DELETE') return jsonResponse({ ok: true });
      return jsonResponse({ salesReps: [repWithoutSlack] });
    });
    render(<StaffMasterPage />);
    await screen.findByText('山田太郎');
    fireEvent.click(screen.getAllByText('削除')[0]);
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/bgj/sales-reps/rep-1', expect.objectContaining({ method: 'DELETE' }));
    });
  });
});
