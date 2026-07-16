import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PatientSidebarNav from './PatientSidebarNav';
import { DEFAULT_NAV_VISIBILITY, type NavVisibility } from '@/lib/patientNav';

describe('PatientSidebarNav', () => {
  it('navVisibilityが全てtrueなら全項目が表示される', () => {
    render(<PatientSidebarNav active="home" navVisibility={DEFAULT_NAV_VISIBILITY} />);
    expect(screen.getByText('ホーム')).toBeInTheDocument();
    expect(screen.getByText('クリニック紹介')).toBeInTheDocument();
    expect(screen.getByText('診療情報')).toBeInTheDocument();
    expect(screen.getByText('サプリメントの受け取り')).toBeInTheDocument();
    expect(screen.getByText('定期購入')).toBeInTheDocument();
    expect(screen.getByText('おすすめ商品')).toBeInTheDocument();
    expect(screen.getByText('Q & A')).toBeInTheDocument();
  });

  it('navVisibilityでfalseにした項目はレンダリングされない', () => {
    const navVisibility: NavVisibility = { ...DEFAULT_NAV_VISIBILITY, shop: false, qa: false };
    render(<PatientSidebarNav active="home" navVisibility={navVisibility} />);
    expect(screen.queryByText('おすすめ商品')).not.toBeInTheDocument();
    expect(screen.queryByText('Q & A')).not.toBeInTheDocument();
    // 他の項目は影響を受けない
    expect(screen.getByText('クリニック紹介')).toBeInTheDocument();
  });

  it('ホームはnavKey未指定のため、visibilityに関わらず常に表示される', () => {
    const navVisibility: NavVisibility = {
      clinicInfo: false, medicalRecord: false, medication: false, subscription: false, shop: false, qa: false,
    };
    render(<PatientSidebarNav active="home" navVisibility={navVisibility} />);
    expect(screen.getByText('ホーム')).toBeInTheDocument();
    expect(screen.queryByText('クリニック紹介')).not.toBeInTheDocument();
  });

  it('activeに一致する項目だけハイライトされる', () => {
    render(<PatientSidebarNav active="shop" navVisibility={DEFAULT_NAV_VISIBILITY} />);
    const activeLink = screen.getByText('おすすめ商品').closest('a');
    const inactiveLink = screen.getByText('クリニック紹介').closest('a');
    expect(activeLink?.className).toContain('bg-[#EFF6FF]');
    expect(inactiveLink?.className).not.toContain('bg-[#EFF6FF]');
  });

  it('childrenをナビ項目の後に描画する', () => {
    render(
      <PatientSidebarNav active="home" navVisibility={DEFAULT_NAV_VISIBILITY}>
        <button>ログアウト</button>
      </PatientSidebarNav>,
    );
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
  });
});
