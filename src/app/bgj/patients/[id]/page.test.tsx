import { act, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BgjPatientDetailPage from './page';
import { clearClinicInfoRequestCache } from '@/lib/client/clinicInfoRequest';

// use(params)がSuspenseをトリガーするため、ルートツリーが自動で提供するSuspense境界を
// テストでも明示的に用意する（admin/patients/[id]/page.test.tsxと同じパターン）。
async function renderPage(params: Promise<{ id: string }>) {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <BgjPatientDetailPage params={params} />
      </Suspense>,
    );
  });
}

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const PATIENT = {
  id: 'p1',
  customer_code: 'A000001',
  patient_no: 'T-00001',
  name: '山田太郎',
  login_id: 'BU000001',
  email: null,
  status: '有効',
  registered_at: '2026-01-01',
  created_at: '',
  updated_at: '',
};

describe('BgjPatientDetailPage', () => {
  beforeEach(() => {
    clearClinicInfoRequestCache();
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/admin/patients/p1/bootstrap') {
        return jsonResponse({ patient: PATIENT, diagnoses: [], stages: [], grades: [] });
      }
      if (url === '/api/admin/clinic-info?customerCode=A000001') {
        return jsonResponse({ clinic: { show_periodontal_diagnosis: false } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = 'demo-patient-id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('医院ポータルの患者詳細と同じbootstrap APIを再利用して表示する', async () => {
    await renderPage(Promise.resolve({ id: 'p1' }));

    expect(await screen.findByRole('heading', { name: '山田太郎' })).toBeInTheDocument();
    expect(screen.getByText('患者様一覧').closest('a')).toHaveAttribute('href', '/bgj/patients');
  });

  it('「患者ポータルを開く（ビュー）」ボタンでdemo-patient-id cookieをセットし別タブで/medicationを開く', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    await renderPage(Promise.resolve({ id: 'p1' }));

    fireEvent.click(await screen.findByText('患者ポータルを開く（ビュー）'));

    expect(document.cookie).toContain('demo-patient-id=p1');
    expect(openSpy).toHaveBeenCalledWith('/medication', '_blank');
    openSpy.mockRestore();
  });
});
