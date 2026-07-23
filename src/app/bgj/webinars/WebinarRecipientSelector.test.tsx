import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WebinarRecipientSelector, { type WebinarContactOption } from './WebinarRecipientSelector';

const clinics = [
  { customer_code: 'A000001', name: '中央歯科' },
  { customer_code: 'A000002', name: '北歯科' },
];
const contacts: WebinarContactOption[] = [
  { id: 'contact-1', customer_code: 'A000001', name: '山田', email: 'same@example.com', role_key: 'dentist', status: 'active', deleted_at: null },
  { id: 'contact-2', customer_code: 'A000001', name: '佐藤', email: 'same@example.com', role_key: 'receptionist', status: 'active', deleted_at: null },
  { id: 'contact-3', customer_code: 'A000002', name: '鈴木', email: null, role_key: 'other', status: 'active', deleted_at: null },
];

describe('WebinarRecipientSelector', () => {
  it('全医院の送付可能担当者を一括選択する', () => {
    const onChange = vi.fn();
    render(<WebinarRecipientSelector clinics={clinics} contacts={contacts} roleLabels={new Map([['dentist', '歯科医師'], ['receptionist', '受付'], ['other', 'その他']])} selectedContactIds={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '全医院・全担当者を選択' }));
    expect(onChange).toHaveBeenCalledWith(['A000001'], ['contact-1', 'contact-2']);
    expect(screen.getByText('送付可能者なし')).toBeInTheDocument();
  });
});
