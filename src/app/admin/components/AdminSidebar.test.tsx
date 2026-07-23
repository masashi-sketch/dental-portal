import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminSidebar from './AdminSidebar';
import { clearExternalLinksRequestCache } from '@/lib/client/externalLinksRequest';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'クリニック担当者' } } }),
  signOut: vi.fn(),
}));

const useActiveClinicMock = vi.fn();
vi.mock('@/hooks/useActiveClinic', () => ({
  useActiveClinic: () => useActiveClinicMock(),
}));

const fetchMock = vi.fn();

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const link = {
  id: 'link-1',
  label: 'BiogaiaAcademy',
  url: 'https://biogaia-academy.jp/',
  created_at: '',
  updated_at: '',
};

describe('AdminSidebar 外部リンク（LINKS）', () => {
  beforeEach(() => {
    clearExternalLinksRequestCache();
    useActiveClinicMock.mockReturnValue({ clinicName: 'テストデンタル', salesRep: null, loaded: true });
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('BGJが登録した外部リンクを取得して表示する', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ externalLinks: [link] }));
    render(<AdminSidebar active="dashboard" />);
    const items = await screen.findAllByText('BiogaiaAcademy');
    expect(items.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith('/api/bgj/external-links');
  });

  it('クリニック情報から担当者情報を開ける', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ externalLinks: [] }));
    render(<AdminSidebar active="clinicContacts" />);
    const links = await screen.findAllByRole('link', { name: '担当者管理一覧' });
    expect(links[0]).toHaveAttribute('href', '/admin/clinic-info/contacts');
  });

  it('リンクが0件のときはLINKS欄自体を表示しない', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ externalLinks: [] }));
    render(<AdminSidebar active="dashboard" />);
    await screen.findAllByText('ダッシュボード');
    expect(screen.queryByText('LINKS')).not.toBeInTheDocument();
  });

  it('取得失敗時もLINKS欄を表示しない（他の機能に影響しない）', async () => {
    fetchMock.mockResolvedValue(Promise.resolve({ ok: false, json: async () => ({}) }));
    render(<AdminSidebar active="dashboard" />);
    await screen.findAllByText('ダッシュボード');
    expect(screen.queryByText('LINKS')).not.toBeInTheDocument();
  });
});

describe('AdminSidebar 営業担当カードのお問い合わせボタン', () => {
  const salesRep = {
    id: 'rep-1',
    name: '営業太郎',
    role_id: null,
    area_id: null,
    phone: '03-1234-5678',
    photo_url: null,
    slack_user_id: null,
    created_at: '',
    updated_at: '',
    role: null,
    area: null,
  };

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({ externalLinks: [] }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('担当者のemailが登録されていても/admin/inquiryへのリンクになる（mailto:は使わない）', async () => {
    useActiveClinicMock.mockReturnValue({
      clinicName: 'テストデンタル',
      salesRep: { ...salesRep, email: 'rep@example.com' },
      loaded: true,
    });
    render(<AdminSidebar active="dashboard" />);
    fireEvent.click(await screen.findByRole('button', { name: /営業担当 営業太郎/ }));

    // サイドバーナビにも「患者様用お問い合わせ」リンク（/admin/inquiry固定、名前に「お問い合わせ」を含む）が
    // 別途存在するため、mailto:リンクが含まれないことをhrefベースで確認する。
    const links = await screen.findAllByRole('link', { name: /お問い合わせ/ });
    const hrefs = links.map((el) => el.getAttribute('href'));
    expect(hrefs).not.toContain('mailto:rep@example.com');
    expect(hrefs.filter((h) => h === '/admin/inquiry').length).toBeGreaterThanOrEqual(2);
  });

  it('担当者のemailが未登録の場合も/admin/inquiryへのリンクになる（クリック無反応の回帰防止）', async () => {
    useActiveClinicMock.mockReturnValue({
      clinicName: 'テストデンタル',
      salesRep: { ...salesRep, email: null },
      loaded: true,
    });
    render(<AdminSidebar active="dashboard" />);
    fireEvent.click(await screen.findByRole('button', { name: /営業担当 営業太郎/ }));

    const links = await screen.findAllByRole('link', { name: /お問い合わせ/ });
    const hrefs = links.map((el) => el.getAttribute('href'));
    // 営業担当カード側・サイドバーナビ側の両方が/admin/inquiryを指す
    expect(hrefs.filter((h) => h === '/admin/inquiry').length).toBeGreaterThanOrEqual(2);
  });

  it('担当営業が未割当（salesRep=null）でも/admin/inquiryへのリンクが表示される', async () => {
    useActiveClinicMock.mockReturnValue({
      clinicName: 'テストデンタル',
      salesRep: null,
      loaded: true,
    });
    render(<AdminSidebar active="dashboard" />);
    fireEvent.click(await screen.findByRole('button', { name: '営業担当' }));

    const links = await screen.findAllByRole('link', { name: /お問い合わせ/ });
    const hrefs = links.map((el) => el.getAttribute('href'));
    expect(hrefs.filter((h) => h === '/admin/inquiry').length).toBeGreaterThanOrEqual(2);
  });
});
