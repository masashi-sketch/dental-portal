import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClinicStatusesMasterPage from './page';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const status = {
  id: 'status-1',
  name: '活性',
  color: 'emerald',
  created_at: '',
  updated_at: '',
};

describe('ClinicStatusesMasterPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('登録済みステータスをバッジ色付きで表示する', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ clinicStatuses: [status] }));
    render(<ClinicStatusesMasterPage />);
    const badge = await screen.findByText('活性');
    expect(badge).toHaveClass('bg-emerald-100');
  });

  it('0件のときは案内文を表示する', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ clinicStatuses: [] }));
    render(<ClinicStatusesMasterPage />);
    expect(await screen.findByText('ステータスがまだ登録されていません')).toBeInTheDocument();
  });

  it('名称と色を入力して追加できる', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return jsonResponse({ clinicStatus: status }, true);
      return jsonResponse({ clinicStatuses: [] });
    });
    render(<ClinicStatusesMasterPage />);
    await screen.findByText('ステータスがまだ登録されていません');

    fireEvent.click(screen.getByText('ステータスを追加'));
    fireEvent.change(screen.getByPlaceholderText('例）休止中'), { target: { value: '休止中' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sky' } });
    fireEvent.click(screen.getByText('追加'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/bgj/clinic-statuses',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: '休止中', color: 'sky' }) })
      );
    });
  });
});
