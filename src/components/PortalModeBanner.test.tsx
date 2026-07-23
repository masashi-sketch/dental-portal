import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { bootstrapPortalPreviewFromLocation, resetTransientPortalState } from '@/lib/client/portalState';

let pathname = '/admin';
let sessionState: { data: { user: { role: 'bgj' | 'clinic' | 'patient' } } | null; status: string };

vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('next-auth/react', () => ({ useSession: () => sessionState }));

const { default: PortalModeBanner } = await import('./PortalModeBanner');

function setPreview(kind: 'clinic' | 'patient', targetId: string) {
  const payload = { v: 1, kind, targetId, actor: 'test', exp: Math.floor(Date.now() / 1000) + 900 };
  const token = `${btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}.signature`;
  window.history.replaceState(null, '', `/?portalPreview=${encodeURIComponent(token)}`);
  bootstrapPortalPreviewFromLocation();
}

describe('PortalModeBanner', () => {
  beforeEach(() => {
    pathname = '/admin';
    sessionState = { data: { user: { role: 'bgj' } }, status: 'authenticated' };
    resetTransientPortalState();
  });

  afterEach(() => resetTransientPortalState());

  it('BGJ職員が医院代理閲覧中のときだけ医院閲覧バナーを出す', async () => {
    setPreview('clinic', 'A000001');
    render(<PortalModeBanner />);
    expect(await screen.findByText(/得意先コード A000001/)).toBeInTheDocument();
  });

  it('医院管理者に不整合な医院プレビューが残っても破棄し、誤表示しない', async () => {
    setPreview('clinic', 'A000001');
    sessionState = { data: { user: { role: 'clinic' } }, status: 'authenticated' };
    render(<PortalModeBanner />);

    expect(screen.queryByText(/閲覧モード/)).not.toBeInTheDocument();
    await waitFor(() => expect(window.sessionStorage.getItem('portal-preview-token')).toBeNull());
  });

  it('医院スタッフの患者プレビューは患者ポータル内だけで表示する', async () => {
    pathname = '/home';
    setPreview('patient', 'patient-1');
    sessionState = { data: { user: { role: 'clinic' } }, status: 'authenticated' };
    render(<PortalModeBanner />);

    expect(await screen.findByText(/この患者様として一時的に表示/)).toBeInTheDocument();
  });
});
