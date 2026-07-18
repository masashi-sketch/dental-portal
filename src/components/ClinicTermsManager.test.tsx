// fetchするコンポーネントのテスト雛形：global.fetchをvi.stubGlobalでmockし、
// URL・HTTPメソッドで分岐して応答を返す。afterEachでvi.unstubAllGlobals()する。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClinicTermsManager from './ClinicTermsManager';

const terms = {
  commission_rate: 12.5,
  wholesale_rate: 60,
  payment_terms_site: '月末締め翌月末払い',
  payment_method: '銀行振込',
  contract_started_at: '2025-01-01',
  contract_renewal_at: '2026-01-01',
};

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

describe('ClinicTermsManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/bgj/clinic-terms/A000001' && !init?.method) return jsonResponse({ terms });
      if (url === '/api/bgj/clinic-terms/A000001' && init?.method === 'PUT') return jsonResponse({ ok: true });
      throw new Error(`unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('マウント時に取引条件を取得してフォームに反映する', async () => {
    render(<ClinicTermsManager customerCode="A000001" />);
    expect(await screen.findByDisplayValue('12.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();
    expect(screen.getByDisplayValue('月末締め翌月末払い')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-01-01')).toBeInTheDocument();
  });

  it('取引条件が未登録（terms: null）でも初期値で表示される', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ terms: null }));
    render(<ClinicTermsManager customerCode="A000001" />);
    expect(await screen.findByRole('button', { name: '保存する' })).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('0').length).toBe(2); // コミッション率・仕切値率
  });

  it('「保存する」でPUTし、成功トーストを表示する', async () => {
    render(<ClinicTermsManager customerCode="A000001" />);
    await screen.findByDisplayValue('12.5');
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    expect(await screen.findByText('取引条件を保存しました')).toBeInTheDocument();
    const putCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT');
    expect(putCall).toBeDefined();
    const body = JSON.parse((putCall![1] as RequestInit).body as string);
    expect(body).toEqual(
      expect.objectContaining({ commissionRate: 12.5, wholesaleRate: 60, paymentMethod: '銀行振込' }),
    );
  });

  it('保存失敗時はAPIのエラーメッセージをトースト表示する', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ terms });
      return jsonResponse({ error: '保存できませんでした' }, false);
    });
    render(<ClinicTermsManager customerCode="A000001" />);
    await screen.findByDisplayValue('12.5');
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    expect(await screen.findByText('保存できませんでした')).toBeInTheDocument();
  });
});
