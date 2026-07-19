// テスト専用の共通フィクスチャ。アプリ本体からはimportしないこと。
// ClinicWithStaff（Clinic + ClinicPatientSettings + ClinicIntroInfo + staff）は
// フィールド数が多いため、各テストで重複定義せずここのファクトリを使う。
import type { ClinicWithStaff } from '@/lib/clinicForm';

export function makeClinicWithStaff(overrides: Partial<ClinicWithStaff> = {}): ClinicWithStaff {
  return {
    // Clinic
    customer_code: 'A000001',
    name: '中央歯科クリニック',
    area: '東京',
    staff_id: 'rep-1',
    status_id: 'status-1',
    chairs: 5,
    address: '東京都千代田区1-1-1',
    tel: '03-0000-0000',
    contact_person: '田中院長',
    contract_since: '2024-04-01',
    patient_type: 'ファミリー層',
    clinic_type: '一般歯科',
    waiting_room: '広め',
    counseling_room: true,
    closed_day: '水・日',
    full_time_dr: 2,
    part_time_dr: 1,
    hygienist: 3,
    receptionist: 2,
    assistant: 1,
    technician: 0,
    nurse: 0,
    nutritionist: 0,
    childcare: 0,
    main_referrer: '近隣内科',
    created_at: '2024-04-01T00:00:00Z',
    updated_at: '2024-04-01T00:00:00Z',
    // ClinicPatientSettings
    display_name: null,
    patient_background_url: null,
    nav_show_clinic_info: true,
    nav_show_medical_record: true,
    nav_show_medication: true,
    nav_show_subscription: true,
    nav_show_shop: true,
    nav_show_qa: true,
    show_periodontal_diagnosis: true,
    signup_pin: null,
    signup_pin_failed_attempts: 0,
    signup_pin_locked_until: null,
    signup_pin_issued_at: null,
    signup_slug: null,
    // ClinicIntroInfo
    clinic_hours_weekday: '9:00〜18:00',
    clinic_hours_saturday: null,
    clinic_closed_day: null,
    clinic_phone: null,
    clinic_address: null,
    clinic_nearest_station: null,
    clinic_parking: null,
    // staff
    staff: {
      id: 'rep-1',
      name: '営業太郎',
      role_id: 'role-1',
      area_id: 'area-1',
      phone: null,
      email: null,
      photo_url: null,
      slack_user_id: null,
      created_at: '2024-04-01T00:00:00Z',
      updated_at: '2024-04-01T00:00:00Z',
      role: { id: 'role-1', name: '主任', created_at: '', updated_at: '' },
      area: { id: 'area-1', name: '関東', created_at: '', updated_at: '' },
    },
    // clinic_statuses
    status: { id: 'status-1', name: '活性', color: 'emerald', created_at: '', updated_at: '' },
    ...overrides,
  };
}
