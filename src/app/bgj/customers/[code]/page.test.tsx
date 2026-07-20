import { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import CustomerDetailPage from './page';
import { makeClinicWithStaff } from '@/test/fixtures';

// use(params)はPromiseが未解決の1レンダー目でsuspendするため、React 19 + RTLでは
// render自体をawait act(async () => {...})で包まないと、再レンダーがテストに
// 反映されない（renderの外でactを呼んでもこの再試行は拾えない）。
async function renderPage(code: string) {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <CustomerDetailPage params={Promise.resolve({ code })} />
      </Suspense>,
    );
  });
}

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const clinic = makeClinicWithStaff({ customer_code: 'A000001', name: 'サンプル歯科医院' });

describe('CustomerDetailPage 初期データ取得', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('得意先・営業担当・ステータスを1回ずつ並列取得し、得意先名を表示する', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/bgj/clinics/A000001') return jsonResponse({ clinic });
      if (url === '/api/bgj/sales-reps') return jsonResponse({ salesReps: [] });
      if (url === '/api/bgj/clinic-statuses') return jsonResponse({ clinicStatuses: [] });
      throw new Error(`unexpected fetch: ${url}`);
    });

    await renderPage("A000001");

    expect(await screen.findByRole('heading', { name: 'サンプル歯科医院' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('営業担当・ステータスの取得に失敗しても得意先本体は表示する', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/bgj/clinics/A000001') return jsonResponse({ clinic });
      if (url === '/api/bgj/sales-reps') return jsonResponse({}, false);
      if (url === '/api/bgj/clinic-statuses') return jsonResponse({}, false);
      throw new Error(`unexpected fetch: ${url}`);
    });

    await renderPage("A000001");

    expect(await screen.findByRole('heading', { name: 'サンプル歯科医院' })).toBeInTheDocument();
  });

  it('得意先本体の取得に失敗した場合はエラーメッセージを表示する', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/bgj/clinics/A000001') return jsonResponse({}, false);
      if (url === '/api/bgj/sales-reps') return jsonResponse({ salesReps: [] });
      if (url === '/api/bgj/clinic-statuses') return jsonResponse({ clinicStatuses: [] });
      throw new Error(`unexpected fetch: ${url}`);
    });

    await renderPage("A000001");

    expect(await screen.findByText('得意先情報の取得に失敗しました')).toBeInTheDocument();
  });
});
