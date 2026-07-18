import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StaffAreasMasterPage from './page';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const tokyo = { id: 'area-1', name: '東京都', created_at: '', updated_at: '' };
const hokkaido = { id: 'area-2', name: '北海道', created_at: '', updated_at: '' };

describe('StaffAreasMasterPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('都道府県順（地方区分順）に並び替えて表示する', async () => {
    // APIはあいうえお順で返す想定（東京都が先）だが、画面では地方区分順（北海道が先）に並ぶ
    fetchMock.mockResolvedValue(jsonResponse({ staffAreas: [tokyo, hokkaido] }));
    render(<StaffAreasMasterPage />);
    await screen.findByText('北海道');
    const rows = screen.getAllByRole('row');
    // rows[0] はヘッダー行
    expect(rows[1]).toHaveTextContent('北海道');
    expect(rows[2]).toHaveTextContent('東京都');
  });

  it('追加モーダルは都道府県セレクトになっている', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ staffAreas: [] }));
    render(<StaffAreasMasterPage />);
    await screen.findByText('エリアがまだ登録されていません');
    fireEvent.click(screen.getByText('エリアを追加'));
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(screen.getByText('沖縄県')).toBeInTheDocument();
  });

  it('都道府県を選択して登録できる', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return jsonResponse({ staffArea: hokkaido }, true);
      return jsonResponse({ staffAreas: [] });
    });
    render(<StaffAreasMasterPage />);
    await screen.findByText('エリアがまだ登録されていません');
    fireEvent.click(screen.getByText('エリアを追加'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '北海道' } });
    fireEvent.click(screen.getByText('追加'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/bgj/staff-areas',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: '北海道' }) })
      );
    });
  });
});
