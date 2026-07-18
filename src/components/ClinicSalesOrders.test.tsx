// rechartsのグラフ（next/dynamic経由）はjsdomでは正しく描画できないため、
// チャートモジュールをmockし、注文履歴テーブルと月次集計への受け渡しを検証する。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClinicSalesOrders from './ClinicSalesOrders';
import type { ClinicOrder } from '@/lib/supabase/types';

vi.mock('@/components/SalesHistoryChart', () => ({
  default: ({ data }: { data: { month: string; sales: number }[] }) => (
    <div data-testid="chart">{data.map((d) => `${d.month}:${d.sales}`).join(',')}</div>
  ),
}));

function makeOrder(overrides: Partial<ClinicOrder> = {}): ClinicOrder {
  return {
    id: 'o1',
    customer_code: 'A000001',
    order_date: new Date().toISOString().slice(0, 10), // 今月（集計バケットに入る日付）
    product_name: 'プロデンティス30錠',
    quantity: 10,
    amount: 33000,
    status: '出荷済',
    created_at: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

const fetchMock = vi.fn();

describe('ClinicSalesOrders', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url !== '/api/bgj/clinics/A000001/orders') throw new Error(`unexpected fetch: ${url}`);
      return Promise.resolve({ ok: true, json: async () => ({ orders: [makeOrder()] }) });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('マウント時に注文履歴を取得し、テーブルに表示する', async () => {
    render(<ClinicSalesOrders customerCode="A000001" />);
    expect(await screen.findByText('プロデンティス30錠')).toBeInTheDocument();
    expect(screen.getByText('¥33,000')).toBeInTheDocument();
    expect(screen.getByText('出荷済')).toBeInTheDocument();
  });

  it('注文が今月の売上バケットに集計されてグラフに渡る', async () => {
    render(<ClinicSalesOrders customerCode="A000001" />);
    const chart = await screen.findByTestId('chart');
    const thisMonth = `${new Date().getMonth() + 1}月`;
    expect(chart.textContent).toContain(`${thisMonth}:33000`);
  });

  it('注文0件のときは空メッセージを表示する', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: true, json: async () => ({ orders: [] }) }),
    );
    render(<ClinicSalesOrders customerCode="A000001" />);
    expect(await screen.findByText('注文履歴はまだありません')).toBeInTheDocument();
  });

  it('取得失敗（ok=false）でも落ちずに空表示になる', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: false, json: async () => ({ error: 'ng' }) }),
    );
    render(<ClinicSalesOrders customerCode="A000001" />);
    expect(await screen.findByText('注文履歴はまだありません')).toBeInTheDocument();
  });
});
