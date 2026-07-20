import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClinicEmailTemplatesManager from './ClinicEmailTemplatesManager';
import type { ClinicEmailTemplates } from '@/lib/supabase/types';
import { DEFAULT_WELCOME_SUBJECT } from '@/lib/email/templates';

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const templateFixture: ClinicEmailTemplates = {
  customer_code: 'A000001',
  sender_name: '中央歯科クリニック 受付',
  welcome_subject: '【中央歯科クリニック】ご登録ありがとうございます',
  welcome_body: '{{患者名}} 様\n\nご登録が完了しました。',
  password_reset_subject: 'パスワード再設定のご案内',
  password_reset_body: '{{患者名}} 様\n\nパスワードを再設定してください。',
  updated_at: '2026-07-01T00:00:00Z',
};

const URL = '/api/bgj/clinics/A000001/email-templates';

describe('ClinicEmailTemplatesManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('マウント時にテンプレートを取得してフォームに反映し、ローディング表示が消える', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === URL && !init?.method) return jsonResponse({ template: templateFixture });
      throw new Error(`unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
    });
    render(<ClinicEmailTemplatesManager customerCode="A000001" clinicName="中央歯科クリニック" />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();

    expect(await screen.findByDisplayValue(templateFixture.sender_name!)).toBeInTheDocument();
    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue(templateFixture.welcome_subject!)).toBeInTheDocument();
  });

  it('テンプレート未登録（template: null）でも空欄・デフォルト文面のプレビューで表示される', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ template: null }));
    render(<ClinicEmailTemplatesManager customerCode="A000001" clinicName="中央歯科クリニック" />);

    await screen.findByRole('button', { name: '保存する' });
    expect(screen.getByPlaceholderText('中央歯科クリニック')).toHaveValue('');
    expect(
      screen.getByText('【中央歯科クリニック】患者様ポータルのご登録ありがとうございます'),
    ).toBeInTheDocument();
  });

  it('タブを切り替えるとパスワード変更メールの件名・本文に切り替わる', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ template: templateFixture }));
    render(<ClinicEmailTemplatesManager customerCode="A000001" clinicName="中央歯科クリニック" />);
    await screen.findByDisplayValue(templateFixture.welcome_subject!);

    fireEvent.click(screen.getByRole('button', { name: 'パスワード変更メール' }));

    expect(screen.getByDisplayValue(templateFixture.password_reset_subject!)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(templateFixture.welcome_subject!)).not.toBeInTheDocument();
  });

  it('件名・本文を入力するとプレビューが即座に置き換わる', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ template: null }));
    render(<ClinicEmailTemplatesManager customerCode="A000001" clinicName="中央歯科クリニック" />);
    await screen.findByRole('button', { name: '保存する' });

    const subjectInput = screen.getByPlaceholderText(DEFAULT_WELCOME_SUBJECT);
    fireEvent.change(subjectInput, { target: { value: '{{患者名}}様、ご登録ありがとうございます' } });

    expect(screen.getByText('山田 太郎様、ご登録ありがとうございます')).toBeInTheDocument();
  });

  it('「保存する」でPATCHし、成功トーストを表示する', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === URL && !init?.method) return jsonResponse({ template: templateFixture });
      if (url === URL && init?.method === 'PATCH') return jsonResponse({ ok: true });
      throw new Error(`unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
    });
    render(<ClinicEmailTemplatesManager customerCode="A000001" clinicName="中央歯科クリニック" />);
    await screen.findByDisplayValue(templateFixture.welcome_subject!);

    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    expect(await screen.findByText('メール文面を保存しました')).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PATCH');
    const body = JSON.parse((patchCall![1] as RequestInit).body as string);
    expect(body).toEqual({
      senderName: templateFixture.sender_name,
      welcomeSubject: templateFixture.welcome_subject,
      welcomeBody: templateFixture.welcome_body,
      passwordResetSubject: templateFixture.password_reset_subject,
      passwordResetBody: templateFixture.password_reset_body,
    });
  });

  it('保存失敗時はAPIのエラーメッセージをトースト表示する', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === URL && !init?.method) return jsonResponse({ template: templateFixture });
      return jsonResponse({ error: '保存に失敗しました（権限がありません）' }, false);
    });
    render(<ClinicEmailTemplatesManager customerCode="A000001" clinicName="中央歯科クリニック" />);
    await screen.findByDisplayValue(templateFixture.welcome_subject!);

    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    expect(await screen.findByText('保存に失敗しました（権限がありません）')).toBeInTheDocument();
  });
});
