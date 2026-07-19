import { act, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminPatientDetailPage from './page';

// use(params)がSuspenseをトリガーするため、ルートツリーが自動で提供するSuspense境界を
// テストでも明示的に用意する（src/app/bgj/inquiries/[id]/page.test.tsxと同じパターン）。
async function renderPage(params: Promise<{ id: string }>) {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <AdminPatientDetailPage params={params} />
      </Suspense>,
    );
  });
}

const useSessionMock = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => useSessionMock(),
  signOut: vi.fn(),
}));

vi.mock('@/hooks/useActiveClinic', () => ({
  useActiveClinic: () => ({ clinicName: null, salesRep: null, loaded: true }),
}));

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

describe('AdminPatientDetailPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    useSessionMock.mockReturnValue({ data: { user: { role: 'bgj' } }, status: 'authenticated' });
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/admin/patients/p1') return jsonResponse({ patient: PATIENT });
      if (url === '/api/admin/patients/p1/diagnoses') return jsonResponse({ diagnoses: [] });
      if (url === '/api/periodontal/master') return jsonResponse({ stages: [], grades: [] });
      if (url === '/api/admin/clinic-info?customerCode=A000001') {
        return jsonResponse({ clinic: { show_periodontal_diagnosis: false } });
      }
      if (url === '/api/bgj/external-links') return jsonResponse({ externalLinks: [] });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('患者情報から得たcustomer_codeでclinic-infoを取得する（BGJセッションにはcustomerCodeが無いため）', async () => {
    await renderPage(Promise.resolve({ id: 'p1' }));

    expect(await screen.findByRole('heading', { name: '山田太郎' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/clinic-info?customerCode=A000001');
  });

  it('clinicロールのセッションでも同じcustomer_codeでclinic-infoを取得する', async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: 'clinic', customerCode: 'A000001' } }, status: 'authenticated' });
    await renderPage(Promise.resolve({ id: 'p1' }));

    expect(await screen.findByRole('heading', { name: '山田太郎' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/clinic-info?customerCode=A000001');
  });
});
