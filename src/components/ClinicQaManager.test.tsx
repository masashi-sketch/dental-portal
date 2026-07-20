import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClinicQaManager from './ClinicQaManager';
import type { ClinicQa } from '@/lib/supabase/types';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const existing: ClinicQa = {
  id: 'qa-1',
  customer_code: 'A000001',
  category: '予約・診療',
  question: '予約は必要ですか？',
  answer: 'はい、事前予約制です。',
  sort_order: 0,
  status: '公開',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

describe('ClinicQaManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('マウント時に一覧を取得して表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ qa: [existing] }));
    render(<ClinicQaManager />);
    expect(await screen.findByText('Q. 予約は必要ですか？')).toBeInTheDocument();
    expect(screen.getByText('A. はい、事前予約制です。')).toBeInTheDocument();
    expect(screen.getByText('予約・診療')).toBeInTheDocument();
    expect(screen.getByText('公開')).toBeInTheDocument();
  });

  it('0件のときは案内文を表示する', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ qa: [] }));
    render(<ClinicQaManager />);
    expect(await screen.findByText('まだQ&Aが登録されていません')).toBeInTheDocument();
  });

  it('customerCode指定時はクエリ付きでfetchし、保存時のbodyにも含める', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ qa: [] });
      if (init.method === 'POST') {
        return jsonResponse({ qa: { ...existing, id: 'qa-2', question: '駐車場はありますか？' } });
      }
      throw new Error('unexpected fetch: ' + url);
    });
    render(<ClinicQaManager customerCode="A000001" />);
    await screen.findByText('まだQ&Aが登録されていません');
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/clinic-qa?customerCode=A000001');

    fireEvent.click(screen.getByRole('button', { name: '＋ Q&Aを追加' }));
    fireEvent.change(screen.getByPlaceholderText('例）予約・診療'), { target: { value: '駐車場' } });
    const [questionInput, answerInput] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    fireEvent.change(questionInput, { target: { value: '駐車場はありますか？' } });
    fireEvent.change(answerInput, { target: { value: '専用駐車場を10台分ご用意しています。' } });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(await screen.findByText('Q&Aを追加しました')).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'POST');
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body).toEqual(
      expect.objectContaining({
        customerCode: 'A000001',
        category: '駐車場',
        question: '駐車場はありますか？',
        answer: '専用駐車場を10台分ご用意しています。',
      }),
    );
  });

  it('カテゴリ・質問・回答のいずれかが未入力だと保存されない', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ qa: [] }));
    render(<ClinicQaManager />);
    await screen.findByText('まだQ&Aが登録されていません');

    fireEvent.click(screen.getByRole('button', { name: '＋ Q&Aを追加' }));
    fireEvent.change(screen.getByPlaceholderText('例）予約・診療'), { target: { value: 'カテゴリ' } });
    const [questionInput] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    fireEvent.change(questionInput, { target: { value: '質問だけ入力' } });
    // 回答は空のまま保存
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit)?.method === 'POST')).toHaveLength(0);
    expect(screen.getByText('Q&Aを追加')).toBeInTheDocument();
  });

  it('編集すると内容が更新される', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ qa: [existing] });
      if (init.method === 'PATCH') return jsonResponse({ qa: { ...existing, answer: '土日祝も予約可能です。' } });
      throw new Error('unexpected fetch: ' + url);
    });
    render(<ClinicQaManager />);
    await screen.findByText('Q. 予約は必要ですか？');

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    const [, answerInput] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    fireEvent.change(answerInput, { target: { value: '土日祝も予約可能です。' } });
    fireEvent.click(screen.getByRole('button', { name: '更新する' }));

    expect(await screen.findByText('Q&Aを更新しました')).toBeInTheDocument();
    expect(screen.getByText('A. 土日祝も予約可能です。')).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    expect(patchCall![0]).toBe('/api/admin/clinic-qa/qa-1');
  });

  it('ステータスを「下書き」に変更して保存するとbodyに反映される', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ qa: [existing] });
      if (init.method === 'PATCH') return jsonResponse({ qa: { ...existing, status: '下書き' } });
      throw new Error('unexpected fetch: ' + url);
    });
    render(<ClinicQaManager />);
    await screen.findByText('Q. 予約は必要ですか？');

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '下書き' } });
    fireEvent.click(screen.getByRole('button', { name: '更新する' }));

    expect(await screen.findByText('Q&Aを更新しました')).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    const body = JSON.parse((patchCall![1] as RequestInit).body as string);
    expect(body.status).toBe('下書き');
    expect(screen.getByText('下書き')).toBeInTheDocument();
  });

  it('保存失敗時はAPIのエラーメッセージをトースト表示する', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ qa: [] });
      if (init.method === 'POST') return jsonResponse({ error: '保存できませんでした' }, false);
      throw new Error('unexpected fetch: ' + url);
    });
    render(<ClinicQaManager />);
    await screen.findByText('まだQ&Aが登録されていません');

    fireEvent.click(screen.getByRole('button', { name: '＋ Q&Aを追加' }));
    fireEvent.change(screen.getByPlaceholderText('例）予約・診療'), { target: { value: 'カテゴリ' } });
    const [questionInput, answerInput] = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
    fireEvent.change(questionInput, { target: { value: '質問' } });
    fireEvent.change(answerInput, { target: { value: '回答' } });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(await screen.findByText('保存できませんでした')).toBeInTheDocument();
  });

  it('削除確認パネルで確定すると一覧から消える', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ qa: [existing] });
      if (init.method === 'DELETE') return jsonResponse({ ok: true });
      throw new Error('unexpected fetch: ' + url);
    });
    render(<ClinicQaManager />);
    await screen.findByText('Q. 予約は必要ですか？');

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));

    expect(await screen.findByText('Q&Aを削除しました')).toBeInTheDocument();
    expect(screen.queryByText('Q. 予約は必要ですか？')).not.toBeInTheDocument();
    const deleteCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'DELETE');
    expect(deleteCall![0]).toBe('/api/admin/clinic-qa/qa-1');
  });
});
