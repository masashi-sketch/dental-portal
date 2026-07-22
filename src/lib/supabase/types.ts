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
  email: string | null;
  status: '有効' | '無効';
  registered_at: string;
  created_at: string;
  updated_at: string;
  failed_login_attempts: number;
  locked_until: string | null;
};

// 患者様のワンクリックログイン（初回登録メール）・パスワード再設定メール用の
// 使い捨てトークン。src/lib/auth/loginToken.tsのみで扱う（クライアントへは返さない）。
export type PatientLoginToken = {
  id: string;
  patient_id: string;
  expires_at: string;
  used_at: string | null;
  purpose: 'first_login' | 'password_reset';
};

// クライアントへ返す用（password_hash・ログインロックアウト関連の内部情報を含まない）
export type PatientPublic = Omit<Patient, 'password_hash' | 'failed_login_attempts' | 'locked_until'>;

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

export type ClinicStatusColor = 'emerald' | 'amber' | 'red' | 'sky' | 'violet' | 'slate';

export type ClinicStatusMaster = {
  id: string;
  name: string;
  color: ClinicStatusColor;
  created_at: string;
  updated_at: string;
};

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
  slack_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SalesRepWithMaster = SalesRep & {
  role: StaffRole | null;
  area: StaffArea | null;
};

export type ExternalLink = {
  id: string;
  label: string;
  url: string;
  created_at: string;
  updated_at: string;
};

export type Clinic = {
  customer_code: string;
  name: string;
  area: string;
  staff_id: string | null;
  status_id: string | null;
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
  created_at: string;
  updated_at: string;
};

// 患者ポータルに反映する設定（表示名・背景画像URL・ナビ表示切替・歯周病表示切替）。
// clinic_patient_settingsテーブル（1:1、customer_codeが主キー）。
export type ClinicPatientSettings = {
  customer_code: string;
  display_name: string | null;
  patient_background_url: string | null;
  nav_show_clinic_info: boolean;
  nav_show_medical_record: boolean;
  nav_show_medication: boolean;
  nav_show_subscription: boolean;
  nav_show_shop: boolean;
  nav_show_qa: boolean;
  show_periodontal_diagnosis: boolean;
  signup_pin: string | null;
  signup_pin_failed_attempts: number;
  signup_pin_locked_until: string | null;
  signup_pin_issued_at: string | null;
  signup_slug: string | null;
  updated_at: string;
};

// 患者ポータルの「クリニック紹介」画面（診療時間・アクセス）。
// clinic_intro_infoテーブル（1:1、customer_codeが主キー）。
export type ClinicIntroInfo = {
  customer_code: string;
  clinic_hours_weekday: string | null;
  clinic_hours_saturday: string | null;
  clinic_closed_day: string | null;
  clinic_phone: string | null;
  clinic_address: string | null;
  clinic_nearest_station: string | null;
  clinic_parking: string | null;
  updated_at: string;
};

// 得意先ごとにカスタマイズできる患者様向けメール文面。未設定（null）の項目は
// アプリ側の共通デフォルト文面（src/lib/email/templates.ts）を使う。
export type ClinicEmailTemplates = {
  customer_code: string;
  sender_name: string | null;
  welcome_subject: string | null;
  welcome_body: string | null;
  password_reset_subject: string | null;
  password_reset_body: string | null;
  updated_at: string;
};

export type ClinicStaff = {
  id: string;
  customer_code: string;
  role_label: string;
  name: string;
  credentials: string | null;
  description: string | null;
  photo_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ClinicQa = {
  id: string;
  customer_code: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  status: '公開' | '下書き';
  created_at: string;
  updated_at: string;
};

// 医院用ポータル「お知らせ管理」（/admin/news）から入力し、患者ポータルの
// ホーム画面に表示するお知らせ。sort_orderは持たず、announcement_dateの
// 新しい順に表示する。
export type ClinicAnnouncement = {
  id: string;
  customer_code: string;
  announcement_date: string;
  tag: '重要' | 'お知らせ' | 'キャンペーン';
  text: string;
  status: '公開' | '下書き';
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

// 得意先（医院）からの問い合わせ。医院用ポータル（/admin/inquiry）から送信され、
// Slack（Incoming Webhookによる一方向通知）へ担当営業メンション＋返信URL付きで
// 通知される。返信はBGJポータル（/bgj/inquiries/[id]）でのみ行う設計のため、
// Slack側の返信を自動取り込みする仕組みは持たない。
export type ClinicInquiry = {
  id: string;
  customer_code: string;
  subject: string;
  body: string;
  status: '未対応' | '対応中' | '完了';
  created_by: string | null;
  slack_notified_at: string | null;
  created_at: string;
  updated_at: string;
};

// BGJ職員が/bgj/inquiries/[id]で行う返信の会話ログ。
export type ClinicInquiryReply = {
  id: string;
  inquiry_id: string;
  author_name: string | null;
  author_email: string | null;
  body: string;
  created_at: string;
};

// アプリ全体の共通設定（シングルトン、常に1行のみ）。BGJポータル「システム管理 >
// 共通マスタ」で編集する。slack_webhook_urlはクライアントへ絶対に生値を返さないこと
// （src/app/api/bgj/system/settings/route.tsでマスクして返す）。
export type AppSettings = {
  id: 1;
  slack_webhook_url: string | null;
  dashboard_followup_days: number;
  dashboard_dormant_days: number;
  dashboard_include_never_ordered: boolean;
  report_period_months: number;
  updated_by: string | null;
  updated_at: string;
};

export type ClinicUser = {
  id: string;
  customer_code: string;
  login_id: string;
  password_hash: string;
  name: string | null;
  email: string | null;
  status: '有効' | '無効';
  created_at: string;
  updated_at: string;
  failed_login_attempts: number;
  locked_until: string | null;
};

// クライアントへ返す用（password_hash・ログインロックアウト関連の内部情報を含まない）
export type ClinicUserPublic = Omit<ClinicUser, 'password_hash' | 'failed_login_attempts' | 'locked_until'>;

// 医院スタッフのパスワード再設定メール用の使い捨てトークン。
// src/lib/auth/clinicLoginToken.tsのみで扱う（クライアントへは返さない）。
export type ClinicLoginToken = {
  id: string;
  clinic_user_id: string;
  expires_at: string;
  used_at: string | null;
  purpose: 'password_reset';
};

// select('*') を避け、APIルート間で使う列指定をここに集約する。
export const PATIENT_COLUMNS =
  'id, customer_code, patient_no, name, login_id, password_hash, email, status, registered_at, created_at, updated_at, failed_login_attempts, locked_until';

// クライアントへ返す一覧・詳細用（password_hashを含めない）
export const PATIENT_PUBLIC_COLUMNS =
  'id, customer_code, patient_no, name, login_id, email, status, registered_at, created_at, updated_at';

// BGJポータルの患者一覧用（PATIENT_PUBLIC_COLUMNSに加え、ロック状態表示のためlocked_untilを含む）
export const PATIENT_BGJ_LIST_COLUMNS =
  'id, customer_code, patient_no, name, login_id, email, status, registered_at, created_at, updated_at, locked_until';

export const PATIENT_LOGIN_TOKEN_COLUMNS = 'id, patient_id, expires_at, used_at, purpose';

export const PERIODONTAL_STAGE_COLUMNS = 'code, label, name, description, sort_order';

export const PERIODONTAL_GRADE_COLUMNS = 'code, label, name, description, sort_order';

export const PERIODONTAL_DIAGNOSIS_COLUMNS =
  'id, patient_id, stage_code, grade_code, diagnosed_at, memo, created_by, created_at';

export const CLINIC_TERMS_COLUMNS =
  'customer_code, commission_rate, wholesale_rate, payment_terms_site, payment_method, contract_started_at, contract_renewal_at, updated_at, updated_by';

export const CLINIC_COLUMNS =
  'customer_code, name, area, staff_id, status_id, chairs, address, tel, contact_person, contract_since, patient_type, clinic_type, waiting_room, counseling_room, closed_day, full_time_dr, part_time_dr, hygienist, receptionist, assistant, technician, nurse, nutritionist, childcare, main_referrer, created_at, updated_at';

// clinic_patient_settingsテーブル（ブランディング・患者ナビ表示切替・歯周病表示切替）の列。
// 公開エンドポイントでも使う。
export const CLINIC_PATIENT_SETTINGS_COLUMNS =
  'customer_code, display_name, patient_background_url, nav_show_clinic_info, nav_show_medical_record, nav_show_medication, nav_show_subscription, nav_show_shop, nav_show_qa, show_periodontal_diagnosis, signup_pin, signup_pin_failed_attempts, signup_pin_locked_until, signup_pin_issued_at, signup_slug';

// clinic_intro_infoテーブル（患者ポータルの「クリニック紹介」診療時間・アクセス）の列。
export const CLINIC_INTRO_INFO_COLUMNS =
  'customer_code, clinic_hours_weekday, clinic_hours_saturday, clinic_closed_day, clinic_phone, clinic_address, clinic_nearest_station, clinic_parking';

export const CLINIC_EMAIL_TEMPLATES_COLUMNS =
  'customer_code, sender_name, welcome_subject, welcome_body, password_reset_subject, password_reset_body, updated_at';

export const CLINIC_STAFF_COLUMNS =
  'id, customer_code, role_label, name, credentials, description, photo_url, sort_order, created_at, updated_at';

export const CLINIC_QA_COLUMNS =
  'id, customer_code, category, question, answer, sort_order, status, created_at, updated_at';

export const CLINIC_ANNOUNCEMENT_COLUMNS =
  'id, customer_code, announcement_date, tag, text, status, created_at, updated_at';

export const CLINIC_ORDER_COLUMNS =
  'id, customer_code, order_date, product_name, quantity, amount, status, created_at';

export const CLINIC_VISIT_COLUMNS =
  'id, customer_code, visit_date, purpose, memo, next_visit_date, created_by, created_at';

export const CLINIC_INQUIRY_COLUMNS =
  'id, customer_code, subject, body, status, created_by, slack_notified_at, created_at, updated_at';

export const CLINIC_INQUIRY_REPLY_COLUMNS =
  'id, inquiry_id, author_name, author_email, body, created_at';

// slack_webhook_urlは値そのものをクライアントへ返さないため、APIルート側で
// マスク処理してからレスポンスに含める（このAPP_SETTINGS_COLUMNSはDB取得専用）。
export const APP_SETTINGS_COLUMNS =
  'id, slack_webhook_url, dashboard_followup_days, dashboard_dormant_days, dashboard_include_never_ordered, report_period_months, updated_by, updated_at';

export const SALES_REP_COLUMNS =
  'id, name, role_id, area_id, phone, email, photo_url, slack_user_id, created_at, updated_at';

export const STAFF_ROLE_COLUMNS = 'id, name, created_at, updated_at';

export const EXTERNAL_LINK_COLUMNS = 'id, label, url, created_at, updated_at';

export const CLINIC_STATUS_COLUMNS = 'id, name, color, created_at, updated_at';

export const STAFF_AREA_COLUMNS = 'id, name, created_at, updated_at';

export const CLINIC_USER_COLUMNS =
  'id, customer_code, login_id, password_hash, name, email, status, created_at, updated_at, failed_login_attempts, locked_until';

// クライアントへ返す一覧・詳細用（password_hashを含めない）
export const CLINIC_USER_PUBLIC_COLUMNS =
  'id, customer_code, login_id, name, email, status, created_at, updated_at';

export const CLINIC_LOGIN_TOKEN_COLUMNS = 'id, clinic_user_id, expires_at, used_at, purpose';

// BGJポータル「システム管理」：bgj_db_table_usage()のRPC結果
export type DbTableUsage = { table_name: string; size_bytes: number; row_estimate: number };

// 商品マスタ（BGJポータル /bgj/master/products で管理、Shopify連携Phase 1）。
// image_urlが未設定の場合はimage_type（CSSグラデーション＋SVG描画キー）でフォールバック表示する。
export type ProductCategory = 'お口と喉のケア' | '赤ちゃん・キッズ' | '抵抗力サポート' | '胃腸のサポート' | 'ペット向け';
export type ProductImageType = 'supplement' | 'yogurt' | 'toothbrush' | 'oral';
export type ProductBadgeColor = 'indigo' | 'rose' | 'amber' | 'emerald' | 'sky' | 'slate';

export type Product = {
  id: string;
  name: string;
  product_code: string | null;
  category: ProductCategory;
  description: string | null;
  price: number;
  unit: string | null;
  image_type: ProductImageType;
  image_url: string | null;
  badge: string | null;
  badge_color: ProductBadgeColor | null;
  subscription_available: boolean;
  volume: string | null;
  ingredients: string | null;
  how_to_use: string | null;
  caution: string | null;
  working_point: string | null;
  daily_amount: string | null;
  recommendation_level: '◎' | '○' | null;
  doctor_comment: string | null;
  status: '公開' | '下書き';
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const PRODUCT_COLUMNS =
  'id, name, product_code, category, description, price, unit, image_type, image_url, badge, badge_color, subscription_available, volume, ingredients, how_to_use, caution, working_point, daily_amount, recommendation_level, doctor_comment, status, sort_order, created_at, updated_at';

// 医院ごとの患者ポータル表示設定。行が無い商品は「表示」扱い。
export type ClinicProductSetting = {
  customer_code: string;
  product_id: string;
  is_visible: boolean;
  updated_at: string;
};

export const CLINIC_PRODUCT_SETTING_COLUMNS = 'customer_code, product_id, is_visible, updated_at';

export type PatientOrderType = 'one_time' | 'subscription';
export type FulfillmentMethod = 'pickup' | 'delivery';
export type PatientOrderStatus = 'received' | 'preparing' | 'ready' | 'shipped' | 'completed' | 'canceled';
export type CommerceSource = 'internal' | 'shopify';
export type CommerceSyncStatus = 'local' | 'pending' | 'synced' | 'error';
export type OrderCreatedVia = 'clinic_portal' | 'bgj_portal' | 'shopify';

export type PatientOrderEvent = {
  id: string;
  order_id: string;
  event_type: 'created' | 'status_changed';
  actor_type: 'bgj' | 'clinic' | 'system' | 'external';
  actor_identifier: string;
  from_status: PatientOrderStatus | null;
  to_status: PatientOrderStatus | null;
  created_at: string;
};

export type OrderShippingAddress = {
  order_id: string;
  postal_code: string;
  prefecture: string;
  city: string;
  address_line1: string;
  address_line2: string | null;
  recipient_name: string;
  phone: string;
  created_at: string;
};

export const ORDER_SHIPPING_ADDRESS_COLUMNS =
  'order_id, postal_code, prefecture, city, address_line1, address_line2, recipient_name, phone, created_at';

export const PATIENT_ORDER_EVENT_COLUMNS =
  'id, order_id, event_type, actor_type, actor_identifier, from_status, to_status, created_at';

export type PatientOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  unit_snapshot: string | null;
  image_type_snapshot: ProductImageType;
  daily_amount_snapshot: string | null;
  volume_snapshot: string | null;
  caution_snapshot: string | null;
  external_line_item_id: string | null;
  created_at: string;
};

export type PatientOrder = {
  id: string;
  customer_code: string;
  patient_id: string;
  order_type: PatientOrderType;
  fulfillment_method: FulfillmentMethod;
  status: PatientOrderStatus;
  ordered_at: string;
  next_fulfillment_date: string | null;
  source: CommerceSource;
  created_via: OrderCreatedVia;
  external_order_id: string | null;
  sync_status: CommerceSyncStatus;
  sync_error: string | null;
  idempotency_key: string | null;
  external_updated_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: { id: string; name: string; patient_no?: string } | null;
  items: PatientOrderItem[];
  shipping_address?: OrderShippingAddress | null;
};

export const PATIENT_ORDER_COLUMNS =
  'id, customer_code, patient_id, order_type, fulfillment_method, status, ordered_at, next_fulfillment_date, source, created_via, external_order_id, sync_status, sync_error, idempotency_key, external_updated_at, created_at, updated_at';
export const PATIENT_ORDER_ITEM_COLUMNS =
  'id, order_id, product_id, product_name, unit_price, quantity, unit_snapshot, image_type_snapshot, daily_amount_snapshot, volume_snapshot, caution_snapshot, external_line_item_id, created_at';
export const PATIENT_ORDER_WITH_DETAILS_COLUMNS =
  `${PATIENT_ORDER_COLUMNS}, patient:patients!patient_id(id, name, patient_no), items:patient_order_items(${PATIENT_ORDER_ITEM_COLUMNS}), shipping_address:order_shipping_addresses!order_id(${ORDER_SHIPPING_ADDRESS_COLUMNS})`;
