import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClinicBasicInfoTab from './ClinicBasicInfoTab';
import { clinicToForm } from '@/lib/clinicForm';
import { makeClinicWithStaff } from '@/test/fixtures';

const clinic = makeClinicWithStaff();

function renderTab(overrides: Partial<React.ComponentProps<typeof ClinicBasicInfoTab>> = {}) {
  const props = {
    clinic,
    clinicForm: clinicToForm(clinic),
    editingClinic: false,
    savingClinic: false,
    salesReps: [clinic.staff!],
    onEdit: vi.fn(),
    onCancel: vi.fn(),
    onSave: vi.fn(),
    onFormChange: vi.fn(),
    ...overrides,
  };
  render(<ClinicBasicInfoTab {...props} />);
  return props;
}

describe('ClinicBasicInfoTab', () => {
  it('閲覧モード：医院名・得意先コード・担当営業を表示する', () => {
    renderTab();
    expect(screen.getByText('中央歯科クリニック')).toBeInTheDocument();
    expect(screen.getByText('A000001')).toBeInTheDocument();
    expect(screen.getByText('営業太郎')).toBeInTheDocument();
  });

  it('閲覧モード：未設定の項目はプレースホルダ文言を表示する', () => {
    renderTab();
    expect(screen.getByText('（未設定・医院名を表示）')).toBeInTheDocument();
    expect(screen.getByText('（未設定・標準画像を使用）')).toBeInTheDocument();
  });

  it('「編集する」を押すとonEditが呼ばれる', () => {
    const props = renderTab();
    fireEvent.click(screen.getByRole('button', { name: '編集する' }));
    expect(props.onEdit).toHaveBeenCalledTimes(1);
  });

  it('編集モード：フォーム値がinputに入り、変更でonFormChangeが呼ばれる', () => {
    const props = renderTab({ editingClinic: true });
    const nameInput = screen.getByDisplayValue('中央歯科クリニック');
    fireEvent.change(nameInput, { target: { value: '新しい医院名' } });
    expect(props.onFormChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: '新しい医院名' }),
    );
  });

  it('編集モード：保存・キャンセルでそれぞれのコールバックが呼ばれる', () => {
    const props = renderTab({ editingClinic: true });
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    expect(props.onSave).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('保存中は保存ボタンが「保存中...」表示で押せない', () => {
    renderTab({ editingClinic: true, savingClinic: true });
    expect(screen.getByRole('button', { name: '保存中...' })).toBeDisabled();
  });
});
