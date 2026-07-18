import { describe, expect, it } from 'vitest';
import { clinicToForm } from './clinicForm';
import { makeClinicWithStaff } from '@/test/fixtures';

describe('clinicToForm', () => {
  it('DB行（snake_case）を編集フォーム（camelCase）に変換する', () => {
    const form = clinicToForm(makeClinicWithStaff());
    expect(form.name).toBe('中央歯科クリニック');
    expect(form.area).toBe('東京');
    expect(form.staffId).toBe('rep-1');
    expect(form.status).toBe('活性');
    expect(form.contactPerson).toBe('田中院長');
    expect(form.contractSince).toBe('2024-04-01');
    expect(form.counselingRoom).toBe(true);
    expect(form.clinicHoursWeekday).toBe('9:00〜18:00');
  });

  it('数値フィールドはinput用に文字列へ変換する', () => {
    const form = clinicToForm(makeClinicWithStaff({ chairs: 5, full_time_dr: 2, hygienist: 3 }));
    expect(form.chairs).toBe('5');
    expect(form.fullTimeDr).toBe('2');
    expect(form.hygienist).toBe('3');
    expect(typeof form.chairs).toBe('string');
  });

  it('nullのフィールドは空文字にする（inputがuncontrolledにならないように）', () => {
    const form = clinicToForm(
      makeClinicWithStaff({
        staff_id: null,
        address: null,
        tel: null,
        display_name: null,
        patient_background_url: null,
        clinic_parking: null,
      }),
    );
    expect(form.staffId).toBe('');
    expect(form.address).toBe('');
    expect(form.tel).toBe('');
    expect(form.displayName).toBe('');
    expect(form.patientBackgroundUrl).toBe('');
    expect(form.clinicParking).toBe('');
  });
});
