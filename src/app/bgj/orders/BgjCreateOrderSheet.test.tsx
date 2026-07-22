import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BgjCreateOrderSheet from './BgjCreateOrderSheet';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body });
}

describe('BgjCreateOrderSheet', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', vi.fn(() => true));
    fetchMock.mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/bgj/orders/create-options') {
        return jsonResponse({ clinics: [{ customer_code: 'A000001', name: '広島中央歯科' }] });
      }
      if (url.startsWith('/api/admin/delivery-destinations')) {
        const patientDestination = url.includes('patientId=');
        return jsonResponse({ destinations: [{
          id: patientDestination ? '66666666-6666-4666-8666-666666666666' : '55555555-5555-4555-8555-555555555555',
          clinic_customer_code: patientDestination ? null : 'A000001', patient_id: patientDestination ? '11111111-1111-4111-8111-111111111111' : null,
          label: patientDestination ? '自宅' : '本院', postal_code: patientDestination ? '100-0001' : '730-0011', prefecture: patientDestination ? '東京都' : '広島県',
          city: patientDestination ? '千代田区' : '広島市', address_line1: patientDestination ? '千代田1-1' : '基町1-1', address_line2: null,
          recipient_name: patientDestination ? '患者 花子' : '広島中央歯科', phone: '090-1234-5678', is_default: true, deleted_at: null,
          created_at: '2026-07-22T00:00:00Z', updated_at: '2026-07-22T00:00:00Z',
        }] });
      }
      if (url.includes('customerCode=A000001')) {
        return jsonResponse({
          clinic: { customer_code: 'A000001', name: '広島中央歯科' },
          patients: [{ id: '11111111-1111-4111-8111-111111111111', customer_code: 'A000001', patient_no: 'P000001', name: '患者 花子' }],
          products: [
            { id: '33333333-3333-4333-8333-333333333333', product_code: 'PRD-1', name: '商品A', price: 1000, unit: '箱' },
            { id: '44444444-4444-4444-8444-444444444444', product_code: 'PRD-2', name: '商品B', price: 500, unit: '袋' },
          ],
        });
      }
      if (url === '/api/bgj/orders' && init?.method === 'POST') {
        return jsonResponse({ order: { orderId: 'order-1' } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
  });

  it('医院・既存患者・複数商品を選び、確認後に医院受け取り注文を登録する', async () => {
    const onCreated = vi.fn();
    render(<BgjCreateOrderSheet open onClose={vi.fn()} onCreated={onCreated} />);

    fireEvent.click(await screen.findByRole('button', { name: /広島中央歯科/ }));
    await screen.findByRole('option', { name: '患者 花子（P000001）' });
    fireEvent.change(screen.getByLabelText('患者'), { target: { value: '11111111-1111-4111-8111-111111111111' } });

    fireEvent.change(screen.getByLabelText('追加する商品'), { target: { value: '33333333-3333-4333-8333-333333333333' } });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));
    fireEvent.change(screen.getByLabelText('商品Aの数量'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('追加する商品'), { target: { value: '44444444-4444-4444-8444-444444444444' } });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    await screen.findByText('本院');

    fireEvent.click(screen.getByRole('button', { name: '確認へ' }));
    expect(screen.getByText('受注内容の確認')).toBeInTheDocument();
    expect(screen.getByText('¥2,500')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '受注を確定' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    const createCall = fetchMock.mock.calls.find(([url, init]) => url === '/api/bgj/orders' && init?.method === 'POST');
    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      customerCode: 'A000001',
      patientId: '11111111-1111-4111-8111-111111111111',
      items: [
        { productId: '33333333-3333-4333-8333-333333333333', quantity: 2 },
        { productId: '44444444-4444-4444-8444-444444444444', quantity: 1 },
      ],
      fulfillmentMethod: 'pickup',
      deliveryDestinationId: '55555555-5555-4555-8555-555555555555',
    });
  });

  it('自宅受け取りを選び、配送先付きで登録する', async () => {
    const onCreated = vi.fn();
    render(<BgjCreateOrderSheet open onClose={vi.fn()} onCreated={onCreated} />);
    fireEvent.click(await screen.findByRole('button', { name: /広島中央歯科/ }));
    await screen.findByRole('option', { name: '患者 花子（P000001）' });
    fireEvent.change(screen.getByLabelText('患者'), { target: { value: '11111111-1111-4111-8111-111111111111' } });
    fireEvent.change(screen.getByLabelText('追加する商品'), { target: { value: '33333333-3333-4333-8333-333333333333' } });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));
    fireEvent.click(screen.getByRole('button', { name: /ご自宅へお届け/ }));
    await screen.findByText('自宅');
    fireEvent.click(screen.getByRole('button', { name: '確認へ' }));
    expect(screen.getByText(/〒100-0001 東京都千代田区千代田1-1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '受注を確定' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    const createCall = fetchMock.mock.calls.find(([url, init]) => url === '/api/bgj/orders' && init?.method === 'POST');
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      fulfillmentMethod: 'delivery',
      deliveryDestinationId: '66666666-6666-4666-8666-666666666666',
    });
  });

  it('入力中に閉じる場合は破棄確認を行い、拒否時はシートを維持する', async () => {
    const onClose = vi.fn();
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal('confirm', confirmMock);
    render(<BgjCreateOrderSheet open onClose={onClose} onCreated={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /広島中央歯科/ }));
    await screen.findByRole('option', { name: '患者 花子（P000001）' });
    fireEvent.click(screen.getByRole('button', { name: '× 閉じる' }));

    expect(confirmMock).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
