import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClinicBusinessInfoTab from './ClinicBusinessInfoTab';
import { clinicToForm } from '@/lib/clinicForm';
import { makeClinicWithStaff } from '@/test/fixtures';

const clinic = makeClinicWithStaff();

function renderTab(overrides: Partial<React.ComponentProps<typeof ClinicBusinessInfoTab>> = {}) {
  const props = {
    clinic,
    clinicForm: clinicToForm(clinic),
    editingClinic: false,
    savingClinic: false,
    onEdit: vi.fn(),
    onCancel: vi.fn(),
    onSave: vi.fn(),
    onFormChange: vi.fn(),
    ...overrides,
  };
  render(<ClinicBusinessInfoTab {...props} />);
  return props;
}

describe('ClinicBusinessInfoTab', () => {
  it('閲覧モード：チェア数・スタッフ数などを単位付きで表示する', () => {
    renderTab();
    expect(screen.getByText('5台')).toBeInTheDocument();
    expect(screen.getByText('3名')).toBeInTheDocument(); // 歯科衛生士数（フィクスチャで一意な人数）
    expect(screen.getByText('あり')).toBeInTheDocument(); // カウンセリングルーム
    expect(screen.getByText('ファミリー層')).toBeInTheDocument();
  });

  it('「編集する」を押すとonEditが呼ばれる（基本情報タブと編集状態を共有する前提）', () => {
    const props = renderTab();
    fireEvent.click(screen.getByRole('button', { name: '編集する' }));
    expect(props.onEdit).toHaveBeenCalledTimes(1);
  });

  it('編集モード：テキスト項目の変更でonFormChangeが呼ばれる', () => {
    const props = renderTab({ editingClinic: true });
    const patientTypeInput = screen.getByDisplayValue('ファミリー層');
    fireEvent.change(patientTypeInput, { target: { value: '高齢者中心' } });
    expect(props.onFormChange).toHaveBeenCalledWith(
      expect.objectContaining({ patientType: '高齢者中心' }),
    );
  });

  it('編集モード：カウンセリングルームのチェック切替でonFormChangeが呼ばれる', () => {
    const props = renderTab({ editingClinic: true });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(props.onFormChange).toHaveBeenCalledWith(
      expect.objectContaining({ counselingRoom: false }),
    );
  });

  it('編集モード：保存・キャンセルでそれぞれのコールバックが呼ばれる', () => {
    const props = renderTab({ editingClinic: true });
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    expect(props.onSave).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });
});
