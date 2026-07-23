import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { resetTransientPortalState } from '@/lib/client/portalState';

let pathname = '/admin';
let sessionState: { data: { user: { role: 'bgj' | 'clinic' | 'patient' } } | null; status: string };

vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('next-auth/react', () => ({ useSession: () => sessionState }));

const { default: PortalModeBanner } = await import('./PortalModeBanner');

describe('PortalModeBanner', () => {
  beforeEach(() => {
    pathname = '/admin';
    sessionState = { data: { user: { role: 'bgj' } }, status: 'authenticated' };
    resetTransientPortalState();
  });

  afterEach(() => resetTransientPortalState());

  it('BGJ職員が医院代理閲覧中のときだけ医院閲覧バナーを出す', async () => {
    document.cookie = 'bgj-viewing-customer-code=A000001; path=/';
    render(<PortalModeBanner />);
    expect(await screen.findByText(/得意先コード A000001/)).toBeInTheDocument();
  });

  it('医院管理者に残ったBGJ代理閲覧cookieを破棄し、誤表示しない', async () => {
    document.cookie = 'bgj-viewing-customer-code=A000001; path=/';
    sessionState = { data: { user: { role: 'clinic' } }, status: 'authenticated' };
    render(<PortalModeBanner />);

    expect(screen.queryByText(/閲覧モード/)).not.toBeInTheDocument();
    await waitFor(() => expect(document.cookie).not.toContain('bgj-viewing-customer-code='));
  });

  it('医院スタッフの患者プレビューは患者ポータル内だけで表示する', async () => {
    pathname = '/home';
    document.cookie = 'demo-patient-id=patient-1; path=/';
    sessionState = { data: { user: { role: 'clinic' } }, status: 'authenticated' };
    render(<PortalModeBanner />);

    expect(await screen.findByText(/この患者様として一時的に表示/)).toBeInTheDocument();
  });
});
