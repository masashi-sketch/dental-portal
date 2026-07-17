import type { Clinic, ClinicIntroInfo, ClinicPatientSettings, ClinicStatus, SalesRepWithMaster } from '@/lib/supabase/types';

// bgj/customers/[code]（得意先詳細）の基本情報・経営情報タブで共有する型と変換関数。
// 両タブは同じ編集状態（clinicForm/editingClinic）を親ページで共有するため、
// ページ本体とタブ用プレゼンテーションコンポーネントの双方から参照する。
export type ClinicWithStaff = Clinic & ClinicPatientSettings & ClinicIntroInfo & { staff: SalesRepWithMaster | null };

export type ClinicFormState = {
  name: string;
  area: string;
  staffId: string;
  status: ClinicStatus;
  address: string;
  tel: string;
  contactPerson: string;
  contractSince: string;
  chairs: string;
  patientType: string;
  clinicType: string;
  waitingRoom: string;
  counselingRoom: boolean;
  closedDay: string;
  fullTimeDr: string;
  partTimeDr: string;
  hygienist: string;
  receptionist: string;
  assistant: string;
  technician: string;
  nurse: string;
  nutritionist: string;
  childcare: string;
  mainReferrer: string;
  displayName: string;
  patientBackgroundUrl: string;
  clinicHoursWeekday: string;
  clinicHoursSaturday: string;
  clinicClosedDay: string;
  clinicPhone: string;
  clinicAddress: string;
  clinicNearestStation: string;
  clinicParking: string;
};

export function clinicToForm(c: ClinicWithStaff): ClinicFormState {
  return {
    name: c.name,
    area: c.area,
    staffId: c.staff_id ?? '',
    status: c.status,
    address: c.address ?? '',
    tel: c.tel ?? '',
    contactPerson: c.contact_person ?? '',
    contractSince: c.contract_since ?? '',
    chairs: String(c.chairs),
    patientType: c.patient_type ?? '',
    clinicType: c.clinic_type ?? '',
    waitingRoom: c.waiting_room ?? '',
    counselingRoom: c.counseling_room,
    closedDay: c.closed_day ?? '',
    fullTimeDr: String(c.full_time_dr),
    partTimeDr: String(c.part_time_dr),
    hygienist: String(c.hygienist),
    receptionist: String(c.receptionist),
    assistant: String(c.assistant),
    technician: String(c.technician),
    nurse: String(c.nurse),
    nutritionist: String(c.nutritionist),
    childcare: String(c.childcare),
    mainReferrer: c.main_referrer ?? '',
    displayName: c.display_name ?? '',
    patientBackgroundUrl: c.patient_background_url ?? '',
    clinicHoursWeekday: c.clinic_hours_weekday ?? '',
    clinicHoursSaturday: c.clinic_hours_saturday ?? '',
    clinicClosedDay: c.clinic_closed_day ?? '',
    clinicPhone: c.clinic_phone ?? '',
    clinicAddress: c.clinic_address ?? '',
    clinicNearestStation: c.clinic_nearest_station ?? '',
    clinicParking: c.clinic_parking ?? '',
  };
}
