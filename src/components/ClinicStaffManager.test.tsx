import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClinicStaffManager from './ClinicStaffManager';
import type { ClinicStaff } from '@/lib/supabase/types';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const existing: ClinicStaff = {
  id: 'staff-1',
  customer_code: 'A000001',
  role_label: '院長',
  name: '山田太郎',
  credentials: '日本歯科大学卒',
  description: '患者様に寄り添う診療を心がけています',
  photo_url: null,
  sort_order: 0,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

describe('ClinicStaffManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('マウント時に一覧を取得して表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ staff: [existing] }));
    render(<ClinicStaffManager />);
    expect(await screen.findByText('山田太郎')).toBeInTheDocument();
    expect(screen.getByText('院長')).toBeInTheDocument();
    expect(screen.getByText('日本歯科大学卒')).toBeInTheDocument();
  });

  it('0件のときは案内文を表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ staff: [] }));
    render(<ClinicStaffManager />);
    expect(await screen.findByText('まだスタッフが登録されていません')).toBeInTheDocument();
  });

  it('customerCode指定時はクエリ付きでfetchし、保存時のbodyにも含める', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ staff: [] });
      if (init.method === 'POST') {
        return jsonResponse({ staff: { ...existing, id: 'staff-2', name: '佐藤花子' } });
      }
      throw new Error('unexpected fetch: ' + url);
    });
    render(<ClinicStaffManager customerCode="A000001" />);
    await screen.findByText('まだスタッフが登録されていません');
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/clinic-staff?customerCode=A000001');

    fireEvent.click(screen.getByRole('button', { name: '＋ スタッフを追加' }));
    fireEvent.change(screen.getByPlaceholderText('例）院長'), { target: { value: '副院長' } });
    fireEvent.change(screen.getByPlaceholderText('例）山田太郎'), { target: { value: '佐藤花子' } });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(await screen.findByText('スタッフを追加しました')).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'POST');
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body).toEqual(
      expect.objectContaining({ customerCode: 'A000001', roleLabel: '副院長', name: '佐藤花子' }),
    );
  });

  it('役職または氏名が未入力だと保存されない', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ staff: [] }));
    render(<ClinicStaffManager />);
    await screen.findByText('まだスタッフが登録されていません');

    fireEvent.click(screen.getByRole('button', { name: '＋ スタッフを追加' }));
    fireEvent.change(screen.getByPlaceholderText('例）院長'), { target: { value: '院長' } });
    // 氏名は空のまま保存
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit)?.method === 'POST')).toHaveLength(0);
    expect(screen.getByText('スタッフを追加')).toBeInTheDocument();
  });

  it('編集すると内容が更新される', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ staff: [existing] });
      if (init.method === 'PATCH') return jsonResponse({ staff: { ...existing, name: '山田次郎' } });
      throw new Error('unexpected fetch: ' + url);
    });
    render(<ClinicStaffManager />);
    await screen.findByText('山田太郎');

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    const nameInput = screen.getByPlaceholderText('例）山田太郎');
    fireEvent.change(nameInput, { target: { value: '山田次郎' } });
    fireEvent.click(screen.getByRole('button', { name: '更新する' }));

    expect(await screen.findByText('スタッフ情報を更新しました')).toBeInTheDocument();
    expect(screen.getByText('山田次郎')).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    expect(patchCall![0]).toBe('/api/admin/clinic-staff/staff-1');
  });

  it('保存失敗時はAPIのエラーメッセージをトースト表示する', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ staff: [] });
      if (init.method === 'POST') return jsonResponse({ error: '保存できませんでした' }, false);
      throw new Error('unexpected fetch: ' + url);
    });
    render(<ClinicStaffManager />);
    await screen.findByText('まだスタッフが登録されていません');

    fireEvent.click(screen.getByRole('button', { name: '＋ スタッフを追加' }));
    fireEvent.change(screen.getByPlaceholderText('例）院長'), { target: { value: '院長' } });
    fireEvent.change(screen.getByPlaceholderText('例）山田太郎'), { target: { value: '山田太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(await screen.findByText('保存できませんでした')).toBeInTheDocument();
  });

  it('削除確認パネルで確定すると一覧から消える', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ staff: [existing] });
      if (init.method === 'DELETE') return jsonResponse({ ok: true });
      throw new Error('unexpected fetch: ' + url);
    });
    render(<ClinicStaffManager />);
    await screen.findByText('山田太郎');

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));

    expect(await screen.findByText('スタッフを削除しました')).toBeInTheDocument();
    expect(screen.queryByText('山田太郎')).not.toBeInTheDocument();
    const deleteCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'DELETE');
    expect(deleteCall![0]).toBe('/api/admin/clinic-staff/staff-1');
  });
});
