import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import WebVitalsReporter from './WebVitalsReporter';

const usePathnameMock = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

let reportCallback: ((metric: unknown) => void) | null = null;
vi.mock('next/web-vitals', () => ({
  useReportWebVitals: (fn: (metric: unknown) => void) => {
    reportCallback = fn;
  },
}));

const captureMessageMock = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => captureMessageMock(...args),
}));

describe('WebVitalsReporter', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/bgj/dashboard');
    captureMessageMock.mockReset();
    reportCallback = null;
  });

  it('良好（good）な計測はSentryへ送らない', () => {
    render(<WebVitalsReporter />);
    reportCallback?.({ name: 'LCP', value: 1200, rating: 'good' });
    expect(captureMessageMock).not.toHaveBeenCalled();
  });

  it('目標を外れた計測（needs-improvement/poor）はルート・ポータル種別付きで送信する', () => {
    render(<WebVitalsReporter />);
    reportCallback?.({ name: 'LCP', value: 4200, rating: 'poor' });

    expect(captureMessageMock).toHaveBeenCalledWith('web-vital.LCP', {
      level: 'warning',
      tags: { route: '/bgj/dashboard', portal: 'bgj', metricName: 'LCP', rating: 'poor' },
      extra: { value: 4200 },
    });
  });

  it('/adminは医院ポータル、それ以外は患者ポータルとしてタグ付けする', () => {
    usePathnameMock.mockReturnValue('/admin/orders');
    render(<WebVitalsReporter />);
    reportCallback?.({ name: 'INP', value: 300, rating: 'needs-improvement' });
    expect(captureMessageMock).toHaveBeenCalledWith(
      'web-vital.INP',
      expect.objectContaining({ tags: expect.objectContaining({ portal: 'clinic' }) }),
    );
  });
});
