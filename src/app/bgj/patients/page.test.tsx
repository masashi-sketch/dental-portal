import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BgjPatientsPage from './page';
import type { BgjPatientsResponse } from '@/app/api/bgj/patients/route';

const fetchMock = vi.fn();

const PATIENTS_RESPONSE: BgjPatientsResponse = {
  patients: [
    {
      id: 'p1',
      customer_code: 'A000001',
      patient_no: 'T-00001',
      name: '山田太郎',
      login_id: 'BU000001',
      email: 'yamada@example.com',
      status: '有効',
      registered_at: '2026-01-01',
      created_at: '',
      updated_at: '',
      locked_until: null,
      clinic_name: 'テスト歯科',
    },
    {
      id: 'p2',
      customer_code: 'A000002',
      patient_no: 'T-00002',
      name: '佐藤花子',
      login_id: 'BU000002',
      email: null,
      status: '有効',
      registered_at: '2026-01-02',
      created_at: '',
      updated_at: '',
      locked_until: '2099-01-01T00:00:00.000Z',
      clinic_name: null,
    },
  ],
  total: 2,
  page: 1,
  pageSize: 50,
};

function stubResponses(response: BgjPatientsResponse = PATIENTS_RESPONSE) {
  fetchMock.mockImplementation(() => Promise.resolve({ ok: true, json: async () => response }));
}

describe('BgjPatientsPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('得意先名・患者番号・氏名・ログインIDを一覧表示する', async () => {
    stubResponses();
    render(<BgjPatientsPage />);

    expect(await screen.findByText('山田太郎')).toBeInTheDocument();
    expect(screen.getByText('テスト歯科')).toBeInTheDocument();
    expect(screen.getByText('T-00001')).toBeInTheDocument();
    expect(screen.getByText('BU000001')).toBeInTheDocument();
  });

  it('得意先名が無い場合は「—」を表示する', async () => {
    stubResponses();
    render(<BgjPatientsPage />);

    expect(await screen.findByText('佐藤花子')).toBeInTheDocument();
    const dashCells = screen.getAllByText('—');
    expect(dashCells.length).toBeGreaterThan(0);
  });

  it('ロック中の患者にはロック中バッジを表示する', async () => {
    stubResponses();
    render(<BgjPatientsPage />);

    expect(await screen.findByText('ロック中')).toBeInTheDocument();
  });

  it('行の詳細リンクはadmin/patients/[id]を指す', async () => {
    stubResponses();
    render(<BgjPatientsPage />);

    const links = await screen.findAllByRole('link', { name: '詳細へ' });
    expect(links[0]).toHaveAttribute('href', '/admin/patients/p1');
  });

  it('検索語を入力すると/api/bgj/patientsにqパラメータ付きでリクエストする', async () => {
    stubResponses();
    render(<BgjPatientsPage />);
    await screen.findByText('山田太郎');

    fireEvent.change(screen.getByPlaceholderText('氏名・ログインID・患者番号で検索'), { target: { value: '山田' } });

    await vi.waitFor(() => {
      const called = fetchMock.mock.calls.some((args: unknown[]) => String(args[0]).includes('q=%E5%B1%B1%E7%94%B0'));
      expect(called).toBe(true);
    });
  });

  it('取得に失敗した場合はエラーメッセージを表示する', async () => {
    fetchMock.mockImplementation(() => Promise.resolve({ ok: false }));
    render(<BgjPatientsPage />);

    expect(await screen.findByText('患者一覧の取得に失敗しました')).toBeInTheDocument();
  });

  it('該当件数が0件のときは空表示メッセージを出す', async () => {
    stubResponses({ patients: [], total: 0, page: 1, pageSize: 50 });
    render(<BgjPatientsPage />);

    expect(await screen.findByText('該当する患者様が見つかりません')).toBeInTheDocument();
  });
});
