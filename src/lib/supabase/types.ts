export type PeriodontalStage = {
  code: number;
  label: string;
  name: string;
  description: string;
  sort_order: number;
};

export type PeriodontalGrade = {
  code: 'A' | 'B' | 'C';
  label: string;
  name: string;
  description: string;
  sort_order: number;
};

export type Patient = {
  id: string;
  customer_code: string;
  patient_no: string;
  name: string;
  login_id: string;
  password_hash: string;
  status: '有効' | '無効';
  registered_at: string;
  created_at: string;
  updated_at: string;
};

// クライアントへ返す用（password_hashを含まない）
export type PatientPublic = Omit<Patient, 'password_hash'>;

export type PeriodontalDiagnosis = {
  id: string;
  patient_id: string;
  stage_code: number;
  grade_code: 'A' | 'B' | 'C';
  diagnosed_at: string;
  memo: string | null;
  created_by: string | null;
  created_at: string;
};

export type PeriodontalDiagnosisWithMaster = PeriodontalDiagnosis & {
  stage: PeriodontalStage | null;
  grade: PeriodontalGrade | null;
};

export type ClinicTerms = {
  customer_code: string;
  commission_rate: number;
  wholesale_rate: number;
  payment_terms_site: string | null;
  payment_method: string | null;
  contract_started_at: string | null;
  contract_renewal_at: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type ClinicStatus = '活性' | '休眠' | '解約リスク';

export type StaffRole = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type StaffArea = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type SalesRep = {
  id: string;
  name: string;
  role_id: string | null;
  area_id: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SalesRepWithMaster = SalesRep & {
  role: StaffRole | null;
  area: StaffArea | null;
};

export type Clinic = {
  customer_code: string;
  name: string;
  area: string;
  staff_id: string | null;
  status: ClinicStatus;
  chairs: number;
  address: string | null;
  tel: string | null;
  contact_person: string | null;
  contract_since: string | null;
  patient_type: string | null;
  clinic_type: string | null;
  waiting_room: string | null;
  counseling_room: boolean;
  closed_day: string | null;
  full_time_dr: number;
  part_time_dr: number;
  hygienist: number;
  receptionist: number;
  assistant: number;
  technician: number;
  nurse: number;
  nutritionist: number;
  childcare: number;
  main_referrer: string | null;
  display_name: string | null;
  patient_background_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ClinicOrder = {
  id: string;
  customer_code: string;
  order_date: string;
  product_name: string;
  quantity: number;
  amount: number;
  status: string;
  created_at: string;
};

export type ClinicVisit = {
  id: string;
  customer_code: string;
  visit_date: string;
  purpose: string;
  memo: string | null;
  next_visit_date: string | null;
  created_by: string | null;
  created_at: string;
};

export type ClinicUser = {
  id: string;
  customer_code: string;
  login_id: string;
  password_hash: string;
  name: string | null;
  status: '有効' | '無効';
  created_at: string;
  updated_at: string;
};

// クライアントへ返す用（password_hashを含まない）
export type ClinicUserPublic = Omit<ClinicUser, 'password_hash'>;

// select('*') を避け、APIルート間で使う列指定をここに集約する。
export const PATIENT_COLUMNS =
  'id, customer_code, patient_no, name, login_id, password_hash, status, registered_at, created_at, updated_at';

// クライアントへ返す一覧・詳細用（password_hashを含めない）
export const PATIENT_PUBLIC_COLUMNS =
  'id, customer_code, patient_no, name, login_id, status, registered_at, created_at, updated_at';

export const PERIODONTAL_STAGE_COLUMNS = 'code, label, name, description, sort_order';

export const PERIODONTAL_GRADE_COLUMNS = 'code, label, name, description, sort_order';

export const PERIODONTAL_DIAGNOSIS_COLUMNS =
  'id, patient_id, stage_code, grade_code, diagnosed_at, memo, created_by, created_at';

export const CLINIC_TERMS_COLUMNS =
  'customer_code, commission_rate, wholesale_rate, payment_terms_site, payment_method, contract_started_at, contract_renewal_at, updated_at, updated_by';

export const CLINIC_COLUMNS =
  'customer_code, name, area, staff_id, status, chairs, address, tel, contact_person, contract_since, patient_type, clinic_type, waiting_room, counseling_room, closed_day, full_time_dr, part_time_dr, hygienist, receptionist, assistant, technician, nurse, nutritionist, childcare, main_referrer, display_name, patient_background_url, created_at, updated_at';

// クリニックのブランディング（表示名・背景画像URL）のみ。公開エンドポイントで使う。
export const CLINIC_BRANDING_COLUMNS = 'customer_code, name, display_name, patient_background_url';

export const CLINIC_ORDER_COLUMNS =
  'id, customer_code, order_date, product_name, quantity, amount, status, created_at';

export const CLINIC_VISIT_COLUMNS =
  'id, customer_code, visit_date, purpose, memo, next_visit_date, created_by, created_at';

export const SALES_REP_COLUMNS = 'id, name, role_id, area_id, phone, email, photo_url, created_at, updated_at';

export const STAFF_ROLE_COLUMNS = 'id, name, created_at, updated_at';

export const STAFF_AREA_COLUMNS = 'id, name, created_at, updated_at';

export const CLINIC_USER_COLUMNS =
  'id, customer_code, login_id, password_hash, name, status, created_at, updated_at';

// クライアントへ返す一覧・詳細用（password_hashを含めない）
export const CLINIC_USER_PUBLIC_COLUMNS =
  'id, customer_code, login_id, name, status, created_at, updated_at';
