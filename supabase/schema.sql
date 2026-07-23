-- Supabase の SQL Editor に貼って実行する。
-- Project Settings > API から URL と service_role キーを取得し、
-- .env.local に SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY として設定すること。
--
-- 注意：この一連のCREATE TABLEは「新規にSupabaseプロジェクトを作る場合」のリファレンス用。
-- 既にテーブルが存在する環境に追記する場合は、差分のALTER/CREATE文だけを実行すること
-- （このファイルをまるごと再実行すると「already exists」エラーになる）。

create extension if not exists pgcrypto;

-- ============================================================
-- 1. 歯周病ステージマスタ（重症度・複雑さ：1〜4）
-- ============================================================
create table public.periodontal_stages (
  code         smallint primary key check (code between 1 and 4),
  label        text not null,
  name         text not null,
  description  text not null,
  sort_order   smallint not null
);

insert into public.periodontal_stages (code, label, name, description, sort_order) values
  (1, 'ステージⅠ', '軽度歯周炎（初期段階）',
     '歯ぐきに軽い炎症がみられる初期の段階です。', 1),
  (2, 'ステージⅡ', '中等度歯周炎',
     '歯を支える骨や組織に、中程度の影響が出ている段階です。', 2),
  (3, 'ステージⅢ', '重度歯周炎',
     '歯を支える骨（歯槽骨）の吸収が、根の長さの1/3を超えている段階です。', 3),
  (4, 'ステージⅣ', '超重度歯周炎',
     '複数の歯に影響が及び、噛み合わせなどの機能回復には複合的な治療が必要な段階です。', 4)
on conflict (code) do nothing;

-- ============================================================
-- 2. 歯周病グレードマスタ（進行リスク・進行速度：A〜C）
-- ============================================================
create table public.periodontal_grades (
  code         char(1) primary key check (code in ('A','B','C')),
  label        text not null,
  name         text not null,
  description  text not null,
  sort_order   smallint not null
);

insert into public.periodontal_grades (code, label, name, description, sort_order) values
  ('A', 'グレードA', '進行が遅い（低リスク）',
     '現時点で進行のスピードは緩やかと考えられます。', 1),
  ('B', 'グレードB', '中等度の進行（一般的リスク）',
     '一般的なペースで進行する可能性がある段階です。', 2),
  ('C', 'グレードC', '進行が速い（高リスク要因あり）',
     '喫煙・糖尿病など、進行を早める要因が見られる段階です。', 3)
on conflict (code) do nothing;

-- ============================================================
-- 3a. 役職マスタ・担当エリアマスタ。BGJポータルの「マスタ」配下で
--     追加・更新・削除する。営業担当者マスタから参照される。
-- ============================================================
create table public.staff_roles (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- name は1エリア＝1都道府県に制約する（src/lib/prefectures.ts の PREFECTURES と同期させる）。
create table public.staff_areas (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (name in (
    '北海道',
    '青森県','岩手県','宮城県','秋田県','山形県','福島県',
    '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
    '新潟県','富山県','石川県','福井県','山梨県','長野県',
    '岐阜県','静岡県','愛知県','三重県',
    '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
    '鳥取県','島根県','岡山県','広島県','山口県',
    '徳島県','香川県','愛媛県','高知県',
    '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県',
    '沖縄県'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at_generic()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_staff_roles_updated_at
  before update on public.staff_roles
  for each row execute function public.set_updated_at_generic();

create trigger trg_staff_areas_updated_at
  before update on public.staff_areas
  for each row execute function public.set_updated_at_generic();

-- BGJポータル「マスタ > LINKマスタ」で管理する、医院用ポータルのサイドバー
-- 「LINKS」欄に表示する外部リンク。医院用ポータル側は表示のみ（編集不可）。
create table public.bgj_external_links (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  url        text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_bgj_external_links_updated_at
  before update on public.bgj_external_links
  for each row execute function public.set_updated_at_generic();

-- ============================================================
-- 3b. 営業担当者マスタ。BGJポータルの「マスタ > 営業担当」で登録・編集する。
--     顔写真は画像URLを保持するのみ（アップロード機能は持たない）。
--     役職・担当エリアはそれぞれのマスタへの実FK（削除時はNULLに戻す＝
--     マスタ側を削除しても担当者データ自体は消さない）。
-- ============================================================
create table public.sales_reps (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role_id       uuid references public.staff_roles (id) on delete set null,
  area_id       uuid references public.staff_areas (id) on delete set null,
  phone         text,
  email         text,
  photo_url     text,                              -- 顔写真の画像URL
  -- 得意先からの問い合わせをSlack通知する際に<@USER_ID>形式でメンションするための
  -- Slackメンバーid（Slackプロフィール「その他」>「メンバーIDをコピー」で取得）。
  slack_user_id text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.set_sales_reps_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_sales_reps_updated_at
  before update on public.sales_reps
  for each row execute function public.set_sales_reps_updated_at();

-- ============================================================
-- 3c. アプリ全体の共通設定（シングルトン、常に1行のみ）。
--     BGJポータル「システム管理 > 共通マスタ」で編集する。
--     Slack Incoming Webhook URLをUIから自己管理できるようにするための
--     テーブル（Vercel環境変数の再設定・再デプロイを不要にする設計判断）。
--     Incoming Webhook URLは平文で保存される点に注意（.env.local管理の秘密情報
--     とは性質が異なるトレードオフだが、Bot Tokenと違い漏洩しても特定チャンネル
--     への投稿しかできず影響は限定的。詳細はCLAUDE.md参照）。将来Slack以外の
--     全社共通設定も同居させる想定のため、汎用的な名前にしている。
-- ============================================================
create table public.app_settings (
  id                                smallint primary key default 1 check (id = 1),
  slack_webhook_url                 text,
  -- BGJダッシュボード（/bgj/dashboard）・レポート（/bgj/reports）画面のアラート閾値・
  -- 集計期間。/bgj/system/settings 画面からBGJが自己管理する（get_bgj_dashboard_overview・
  -- get_bgj_sales_reportが参照する）。
  dashboard_followup_days           integer not null default 60
    check (dashboard_followup_days > 0),
  dashboard_dormant_days            integer not null default 90
    check (dashboard_dormant_days > dashboard_followup_days),
  dashboard_include_never_ordered   boolean not null default true,
  report_period_months              integer not null default 6
    check (report_period_months between 1 and 24),
  updated_by         text,
  updated_at         timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at_generic();

-- ============================================================
-- 3d. 得意先ステータスマスタ。BGJポータルの「マスタ > ステータス」で
--     追加・更新・削除する。得意先マスタ（clinics.status_id）から参照される。
--     colorはTailwindの動的クラス名生成を避けるため固定候補のCHECK制約とし、
--     フロント側で静的なクラス名マップに変換する（clinic_announcements.tagと同様）。
-- ============================================================
create table public.clinic_statuses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text not null default 'slate'
    check (color in ('emerald','amber','red','sky','violet','slate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_clinic_statuses_updated_at
  before update on public.clinic_statuses
  for each row execute function public.set_updated_at_generic();

-- ============================================================
-- 4. 得意先（医院）マスタ。得意先コードをKEYとする。
--    将来Salesforceと連携する想定のため、得意先コードは
--    Salesforce側のID形式を見据えた「英大文字1文字+数字6桁」（例：A000001）とする。
--    BGJポータルで登録・編集し、医院用ポータル（クリニック情報）・患者マスタ・
--    取引条件から参照される。
-- ============================================================
create table public.clinics (
  customer_code   text primary key check (customer_code ~ '^[A-Z]\d{6}$'),
  name            text not null,
  area            text not null,
  staff_id        uuid references public.sales_reps (id),  -- 担当営業
  status_id       uuid references public.clinic_statuses (id) on delete set null,  -- ステータス（マスタ参照）
  chairs          int not null default 0,            -- チェア数
  address         text,
  tel             text,
  contact_person  text,                              -- 医院側の窓口担当者
  contract_since  date,                              -- 取引開始日
  patient_type    text,                              -- 患者層分類
  clinic_type     text,                              -- 診療区分
  waiting_room    text,                              -- 待合室規模
  counseling_room boolean not null default false,
  closed_day      text,                              -- 休診日
  full_time_dr    int not null default 0,
  part_time_dr    int not null default 0,
  hygienist       int not null default 0,
  receptionist    int not null default 0,
  assistant       int not null default 0,
  technician      int not null default 0,
  nurse           int not null default 0,
  nutritionist    int not null default 0,
  childcare       int not null default 0,
  main_referrer   text,                              -- 主な紹介者
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
  -- display_name/patient_background_url/clinic_hours_*/clinic_phone/clinic_address/
  -- clinic_nearest_station/clinic_parking/nav_show_*/show_periodontal_diagnosisは
  -- clinic_patient_settings・clinic_intro_infoテーブルへ移行済み（4b節参照。DROP COLUMN済み）。
);

create or replace function public.set_clinics_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_clinics_updated_at
  before update on public.clinics
  for each row execute function public.set_clinics_updated_at();

-- ============================================================
-- 4b. clinicsから切り出したブランディング・患者ナビ設定・クリニック紹介情報。
--     目的はパフォーマンスではなく、BGJ編集可／医院自身編集可／患者公開という
--     境界をテーブル単位で明示すること。customer_codeを主キー・clinicsへの
--     外部キーとする1:1関係（clinic_termsと同じ設計）。
-- ============================================================
create table public.clinic_patient_settings (
  customer_code              text primary key references public.clinics (customer_code) on delete cascade,
  display_name                text,                      -- 医院・患者ポータルの表示名（未設定ならclinics.nameを使う。医院自身も編集可）
  patient_background_url      text,                       -- 患者ポータルのログイン画面背景画像URL（未設定なら標準画像）
  -- 患者ポータルのサイドバー・ボトムナビ各項目の表示/非表示（クリニック情報＞医院設定情報で編集可、全てデフォルトtrue）。
  -- 「ホーム」はトグル対象外で常に表示。アプリ側で「少なくとも1つはtrue」を強制する（DBレベルの制約は設けていない）。
  nav_show_clinic_info         boolean not null default true,
  nav_show_medical_record      boolean not null default true,
  nav_show_medication          boolean not null default true,
  nav_show_subscription        boolean not null default true,
  nav_show_shop                boolean not null default true,
  nav_show_qa                  boolean not null default true,
  -- 歯周病の診断結果を患者ポータルに表示するか（オフの場合、医院用ポータルでの新規診断入力も不可にする）。
  show_periodontal_diagnosis   boolean not null default true,
  -- 患者様の新規ポータル登録（QRコード + 受付PINによる自己登録、/join/[customerCode]）用。
  -- signup_pinが未設定（null）の間は当該クリニックの自己登録を受け付けない。
  signup_pin                   text,
  signup_pin_failed_attempts   int not null default 0,
  signup_pin_locked_until      timestamptz,
  -- QR・PINを発行（再発行）した日時。updated_atは他の設定変更でも更新されるため、
  -- 「このQRがいつ発行されたか」を正確に示すために専用カラムを持つ。
  signup_pin_issued_at         timestamptz,
  -- QR・登録URL（/join/[signup_slug]）に使う、得意先コードとは無関係なランダム文字列。
  -- 得意先コードは連番的で推測可能なため、URLには一切出さずこちらを使う
  -- （PINと同時に再発行し、古いQRが指すURL自体も無効にする）。
  signup_slug                  text,
  updated_at                   timestamptz not null default now()
);

create trigger trg_clinic_patient_settings_updated_at
  before update on public.clinic_patient_settings
  for each row execute function public.set_updated_at_generic();

create unique index if not exists clinic_patient_settings_signup_slug_key
  on public.clinic_patient_settings (signup_slug) where signup_slug is not null;

create table public.clinic_intro_info (
  customer_code            text primary key references public.clinics (customer_code) on delete cascade,
  -- 患者ポータルの「クリニック紹介」画面に表示する診療時間・アクセス情報（患者向け公開情報。
  -- BGJ内部管理用のclinics.address/tel/closed_dayとは別に、医院自身またはBGJ代理編集で設定する）。
  clinic_hours_weekday      text,                      -- 例：「9:00〜18:00」
  clinic_hours_saturday     text,
  clinic_closed_day         text,                      -- 例：「水・日・祝日」
  clinic_phone              text,
  clinic_address            text,
  clinic_nearest_station    text,
  clinic_parking            text,
  updated_at                timestamptz not null default now()
);

create trigger trg_clinic_intro_info_updated_at
  before update on public.clinic_intro_info
  for each row execute function public.set_updated_at_generic();

-- 得意先（クリニック）ごとにカスタマイズできる患者様向けメール文面（初回登録完了メール・
-- パスワード変更メールなど）。列が空（null）の場合はアプリ側の共通デフォルト文面
-- （src/lib/email/templates.ts）を使う。件名・本文には {{患者名}} 等のプレースホルダを
-- 使え、送信時にアプリ側で実際の値へ置換する（詳細はbgj/manual参照）。
-- 現時点ではBGJポータルの編集・プレビュー画面のみ提供し、実際の送信機能は未実装。
create table public.clinic_email_templates (
  customer_code           text primary key references public.clinics (customer_code) on delete cascade,
  -- 差出人表示名（例：「○○歯科クリニック」）。送信アドレス自体は共通の
  -- WorkSpaceエイリアス1つに固定し、表示名だけを得意先ごとに変える
  -- （実アドレスを得意先の数だけ用意するのは非現実的なため）。未設定ならクリニック名を使う。
  sender_name             text,
  welcome_subject         text,
  welcome_body            text,
  password_reset_subject  text,
  password_reset_body     text,
  updated_at              timestamptz not null default now()
);

create trigger trg_clinic_email_templates_updated_at
  before update on public.clinic_email_templates
  for each row execute function public.set_updated_at_generic();

-- ============================================================
-- 4. 得意先（医院）の注文履歴
-- ============================================================
create table public.clinic_orders (
  id            uuid primary key default gen_random_uuid(),
  customer_code text not null references public.clinics (customer_code) on delete cascade,
  order_date    date not null default current_date,
  product_name  text not null,
  quantity      int not null default 1,
  amount        integer not null default 0,
  status        text not null default '出荷済',
  created_at    timestamptz not null default now()
);

create index idx_clinic_orders_customer_code on public.clinic_orders (customer_code, order_date desc);

-- 得意先一覧（BGJポータル）の「最終注文日・当月売上」をDB側で集計する。
-- clinic_ordersを行単位でアプリ側に転送してlimitで打ち切ると、件数がlimitを超えた
-- 時点で古い得意先の集計が欠落するため、集計自体をPostgres側で完結させる。
create or replace function public.bgj_clinic_order_summary()
returns table (customer_code text, last_order_date date, month_sales bigint)
language sql
stable
as $$
  select
    customer_code,
    max(order_date) as last_order_date,
    coalesce(sum(amount) filter (
      where date_trunc('month', order_date) = date_trunc('month', current_date)
    ), 0) as month_sales
  from public.clinic_orders
  group by customer_code;
$$;

-- ============================================================
-- 5. 得意先（医院）の訪問記録
-- ============================================================
create table public.clinic_visits (
  id              uuid primary key default gen_random_uuid(),
  customer_code   text not null references public.clinics (customer_code) on delete cascade,
  visit_date      date not null default current_date,
  purpose         text not null,
  memo            text,
  next_visit_date date,
  created_by      text,
  created_at      timestamptz not null default now()
);

create index idx_clinic_visits_customer_code on public.clinic_visits (customer_code, visit_date desc);

-- ============================================================
-- 5b. 得意先（医院）からの問い合わせ（Slack通知連携）。
--    医院用ポータル（/admin/inquiry）から送信され、Slack（Incoming Webhookに
--    よる一方向通知）へ担当営業メンション＋返信URL付きで通知される。営業担当者は
--    そのURL（/bgj/inquiries/[id]）からBGJポータル上で返信する（Slack上での
--    返信は自動取り込みしない）。BGJポータルの得意先詳細「行動履歴」タブで
--    訪問記録（clinic_visits）と統合表示する。
-- ============================================================
create table public.clinic_inquiries (
  id                 uuid primary key default gen_random_uuid(),
  customer_code      text not null references public.clinics (customer_code) on delete cascade,
  subject            text not null,
  body               text not null,
  status             text not null default '未対応' check (status in ('未対応','対応中','完了')),
  created_by         text,              -- 送信した医院スタッフの表示名（clinic_users.name、無ければlogin_id）
  slack_notified_at  timestamptz,       -- Slack通知の送信有無・時刻（デバッグ・監査用）
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_clinic_inquiries_customer_code on public.clinic_inquiries (customer_code, created_at desc);

create trigger trg_clinic_inquiries_updated_at
  before update on public.clinic_inquiries
  for each row execute function public.set_updated_at_generic();

-- 返信はBGJポータル（/bgj/inquiries/[id]）からのみ行われる（Slack上での返信の
-- 自動取り込みは行わない設計のため、Slack由来かどうかを区別する列は持たない）。
create table public.clinic_inquiry_replies (
  id            uuid primary key default gen_random_uuid(),
  inquiry_id    uuid not null references public.clinic_inquiries (id) on delete cascade,
  author_name   text,   -- 返信したBGJ職員の表示名
  author_email  text,   -- session.user.email
  body          text not null,
  created_at    timestamptz not null default now()
);

create index idx_clinic_inquiry_replies_inquiry_id
  on public.clinic_inquiry_replies (inquiry_id, created_at);

-- ============================================================
-- 6. 患者マスタ（得意先コード＝医院を識別するコードを保持。得意先マスタへの実FK）
-- ============================================================
create table public.patients (
  id            uuid primary key default gen_random_uuid(),
  customer_code text not null references public.clinics (customer_code),
  seq_no        int generated always as identity,
  patient_no    text generated always as ('T-' || lpad(seq_no::text, 5, '0')) stored,
  name          text not null,
  -- ログインIDは手入力を認めず、全クリニック共通の連番（BU+6桁、patient_noと同じ
  -- seq_noから算出）を自動採番する。発行経路（医院/BGJの手動発行・患者様のQR自己登録）
  -- によらず必ずこの1つの採番ロジックを通る（詳細はCLAUDE.md参照）。
  login_id      text generated always as ('BU' || lpad(seq_no::text, 6, '0')) stored,
  password_hash text not null,
  -- QR自己登録（/join/[slug]）で収集。初回登録メール・パスワード再設定メールの送信に使う。
  -- 医院/BGJによる手動発行では収集していないためnull許容。
  email         text,
  status        text not null default '有効' check (status in ('有効','無効')),
  registered_at date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- ログインの総当たり対策（src/lib/auth/loginLockout.ts）
  failed_login_attempts int not null default 0,
  locked_until           timestamptz,
  unique (login_id)
);

create index idx_patients_customer_code on public.patients (customer_code);

-- メールアドレスは患者間で重複させない（重複するとパスワード再設定時の
-- 患者特定が不能になるため）。手動発行の患者はemailがnullのままなので、
-- nullは複数許容する部分uniqueインデックスにする。
create unique index patients_email_key on public.patients (email) where email is not null;

-- 患者様のワンクリックログイン（初回登録メール）・パスワード再設定メールで使う
-- 使い捨て・期限付きトークン。平文は保存せずハッシュ化して持つ（src/lib/auth/loginToken.ts）。
create table public.patient_login_tokens (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  token_hash  text not null,
  purpose     text not null check (purpose in ('first_login', 'password_reset')),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (token_hash)
);

create index idx_patient_login_tokens_patient_id on public.patient_login_tokens (patient_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- ============================================================
-- 7. 患者ごとの歯周病診断（履歴テーブル。最新1件を患者ポータルに表示する）
-- ============================================================
create table public.periodontal_diagnoses (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  stage_code    smallint not null references public.periodontal_stages (code),
  grade_code    char(1) not null references public.periodontal_grades (code),
  diagnosed_at  date not null default current_date,
  memo          text,
  created_by    text,
  created_at    timestamptz not null default now()
);

create index idx_diagnoses_patient_id on public.periodontal_diagnoses (patient_id);
create index idx_diagnoses_patient_latest
  on public.periodontal_diagnoses (patient_id, diagnosed_at desc, created_at desc);

-- ============================================================
-- 8. 得意先（医院）ごとの取引条件（コミッション率・仕切値率・支払条件・契約情報）
--    得意先コードをKEYとして持つ。BGJポータルで入力し、医院用ポータルの
--    「クリニック情報＞医院契約情報」で参照表示する。得意先マスタへの実FK。
-- ============================================================
create table public.clinic_terms (
  customer_code       text primary key references public.clinics (customer_code) on delete cascade,
  commission_rate     numeric(5,2) not null default 0,  -- コミッション率（%）
  wholesale_rate      numeric(5,2) not null default 0 check (wholesale_rate between 0 and 100), -- 仕切値率（%）
  payment_terms_site  text,                              -- 支払条件（例：月末締め翌月末払い）
  payment_method      text,                              -- 支払方法（例：銀行振込）
  contract_started_at date,                              -- 契約開始日
  contract_renewal_at date,                               -- 次回更新日
  updated_at          timestamptz not null default now(),
  updated_by          text                                -- 更新した社員のメールアドレス
);

create or replace function public.set_clinic_terms_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_clinic_terms_updated_at
  before update on public.clinic_terms
  for each row execute function public.set_clinic_terms_updated_at();

-- ============================================================
-- 9. 医院スタッフ用ログインアカウント（実認証。得意先コードに閉じたセッションを発行する）
--    BGJポータル（/bgj/customers/[code]）で発行し、医院側は /clinic-login でログインする。
--    1得意先コードに複数ログインを許可する（unique制約はlogin_idのみ）。
-- ============================================================
create table public.clinic_users (
  id            uuid primary key default gen_random_uuid(),
  customer_code text not null references public.clinics (customer_code) on delete cascade,
  login_id      text not null unique,
  password_hash text not null,
  name          text,
  -- パスワードをお忘れの方の自己リセット用（BGJがログイン発行・編集画面から入力する。
  -- 未登録でも従来通りBGJによる手動リセットは可能）
  email         text,
  status        text not null default '有効' check (status in ('有効','無効')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- ログインの総当たり対策（src/lib/auth/loginLockout.ts）
  failed_login_attempts int not null default 0,
  locked_until           timestamptz,
  session_version        integer not null default 1 check (session_version > 0),
  last_login_at          timestamptz,
  password_changed_at    timestamptz,
  must_change_password   boolean not null default false
);

create index idx_clinic_users_customer_code on public.clinic_users (customer_code);
alter table public.clinic_users add constraint clinic_users_id_customer_code_key unique (id, customer_code);

create trigger trg_clinic_users_updated_at
  before update on public.clinic_users
  for each row execute function public.set_updated_at_generic();

-- 医院スタッフのパスワード再設定メール用の使い捨てトークン（patient_login_tokensと同型、
-- clinic_users専用。src/lib/auth/clinicLoginToken.tsのみで扱う）。
create table public.clinic_login_tokens (
  id             uuid primary key default gen_random_uuid(),
  clinic_user_id uuid not null references public.clinic_users (id) on delete cascade,
  token_hash     text not null,
  purpose        text not null check (purpose in ('password_reset')),
  expires_at     timestamptz not null,
  used_at        timestamptz,
  created_at     timestamptz not null default now(),
  unique (token_hash)
);

create index idx_clinic_login_tokens_clinic_user_id on public.clinic_login_tokens (clinic_user_id);

-- ============================================================
-- 9.5. 患者ポータルの「クリニック紹介」スタッフ紹介・「Q&A」
--    医院自身、またはBGJポータル（/bgj/customers/[code]）からの代理編集どちらも可能。
--    表示順はsort_orderで管理する（アプリ側で上下ボタンによる並び替えを提供）。
-- ============================================================
create table public.clinic_staff (
  id            uuid primary key default gen_random_uuid(),
  customer_code text not null references public.clinics (customer_code) on delete cascade,
  role_label    text not null,                        -- 例：院長・歯科衛生士・受付
  name          text not null,
  credentials   text,                                 -- 資格・経歴
  description   text,
  photo_url     text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_clinic_staff_customer_code on public.clinic_staff (customer_code, sort_order);

create trigger trg_clinic_staff_updated_at
  before update on public.clinic_staff
  for each row execute function public.set_updated_at_generic();

create table public.clinic_qa (
  id            uuid primary key default gen_random_uuid(),
  customer_code text not null references public.clinics (customer_code) on delete cascade,
  category      text not null,                        -- 患者ポータルのカテゴリタブは登録データから自動生成
  question      text not null,
  answer        text not null,
  sort_order    int not null default 0,
  status        text not null default '公開' check (status in ('公開','下書き')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_clinic_qa_customer_code on public.clinic_qa (customer_code, sort_order);

create trigger trg_clinic_qa_updated_at
  before update on public.clinic_qa
  for each row execute function public.set_updated_at_generic();

-- 医院用ポータル「お知らせ管理」（/admin/news）から入力し、患者ポータルの
-- ホーム画面（デスクトップ・モバイル両方）に表示するお知らせ。sort_orderは
-- 持たず、announcement_date（日付）の新しい順に表示する。
create table public.clinic_announcements (
  id                 uuid primary key default gen_random_uuid(),
  customer_code      text not null references public.clinics (customer_code) on delete cascade,
  announcement_date  date not null default current_date,
  tag                text not null default 'お知らせ' check (tag in ('重要','お知らせ','キャンペーン')),
  text               text not null,
  status             text not null default '公開' check (status in ('公開','下書き')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_clinic_announcements_customer_code
  on public.clinic_announcements (customer_code, announcement_date desc);

create trigger trg_clinic_announcements_updated_at
  before update on public.clinic_announcements
  for each row execute function public.set_updated_at_generic();

-- ============================================================
-- 9.9. 商品マスタ（BGJポータル /bgj/master/products で管理）と
--      医院ごとの患者ポータル表示設定（Shopify連携ロードマップPhase 1）。
--      患者ポータル /shop・/shop[id] はこの実データを表示する。
--      image_urlが未設定の場合はimage_type（CSSグラデーション＋SVG描画キー）でフォールバック表示する。
--      image_urlはSupabase Storageのpublicバケット product-images（storage.buckets、本ファイル末尾の
--      Storage設定コメント参照）にBGJが管理画面からアップロードした画像の公開URLを保存する。
-- ============================================================
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  product_code  text,                -- 社内管理用の商品コード（任意入力・一意）。Shopify連携時のSKU紐付け先候補
  -- カテゴリはバイオガイア公式サイト（jp.biogaia.com）の商品分類に合わせる
  category      text not null check (category in ('お口と喉のケア','赤ちゃん・キッズ','抵抗力サポート','胃腸のサポート','ペット向け')),
  description   text,                -- 一覧カードの説明文
  price         int not null,        -- BGJ基準価格（税込・円）。通常表示は医院通常価格、定期表示は期間別価格を優先
  unit          text,                -- 例「本」「個」「セット」
  image_type    text not null default 'supplement'
    check (image_type in ('supplement','yogurt','toothbrush','oral')),
  image_url     text,                -- Supabase Storage（product-imagesバケット）の公開URL。未設定ならimage_typeのプレースホルダーを表示
  badge         text,                -- 例「歯科医推奨」（null=バッジなし）
  badge_color   text check (badge_color in ('indigo','rose','amber','emerald','sky','slate')),
  subscription_available boolean not null default false,
  -- 詳細ページ項目（未入力は詳細ページでセクションごと非表示）
  volume        text,
  ingredients   text,
  how_to_use    text,
  caution       text,
  -- 先生のおすすめ（全医院共通。医院別コメントはPhase 2のclinic_recommendationsで対応予定）
  working_point        text,
  daily_amount         text,
  recommendation_level text check (recommendation_level in ('◎','○')),
  doctor_comment       text,
  status        text not null default '下書き' check (status in ('公開','下書き')),
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at_generic();

create unique index products_product_code_key on public.products (product_code) where product_code is not null;

-- 医院ごとの患者ポータル表示設定。行が無い商品は「表示」扱い（新商品はデフォルト全医院表示、
-- 医院が非表示にした時だけ行をupsertする）。
create table public.clinic_product_settings (
  customer_code text not null references public.clinics (customer_code) on delete cascade,
  product_id    uuid not null references public.products (id) on delete cascade,
  is_visible    boolean not null default true,
  clinic_price  integer check (clinic_price is null or clinic_price >= 0), -- 医院通常価格。nullならproducts.price
  subscription_3_month_price integer check (subscription_3_month_price is null or subscription_3_month_price >= 0), -- nullなら医院通常価格
  subscription_6_month_price integer check (subscription_6_month_price is null or subscription_6_month_price >= 0), -- nullなら医院通常価格
  updated_at    timestamptz not null default now(),
  primary key (customer_code, product_id)
);

-- 商品画像用Storageバケット（products.image_url）。publicバケットのため読み取りは
-- publicエンドポイント経由で誰でも取得可（商品写真は非機密の販促用コンテンツ）。
-- storage.objectsへのポリシーは定義せず、書き込みは/api/bgj/products/upload-image
-- （service_roleキー・BGJ限定）経由のみに限定する。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- 9.10. 患者注文・受け取り進捗
-- Shopify連携前はsource='internal'で医院が登録する。連携後も同じ内部IDを維持し、
-- external_* と sync_status だけをアダプターが更新する。
-- ============================================================
create table public.patient_orders (
  id                    uuid primary key default gen_random_uuid(),
  customer_code         text not null references public.clinics (customer_code),
  patient_id            uuid not null references public.patients (id) on delete cascade,
  order_type            text not null default 'one_time'
                          check (order_type in ('one_time','subscription')),
  fulfillment_method    text not null default 'pickup'
                          check (fulfillment_method in ('pickup','delivery')),
  status                text not null default 'received'
                          check (status in ('received','preparing','ready','shipped','completed','canceled')),
  ordered_at            timestamptz not null default now(),
  next_fulfillment_date date,
  source                text not null default 'internal'
                          check (source in ('internal','shopify')),
  created_via           text not null default 'clinic_portal'
                          check (created_via in ('clinic_portal','bgj_portal','shopify')),
  external_order_id     text,
  sync_status           text not null default 'local'
                          check (sync_status in ('local','pending','synced','error')),
  sync_error             text,
  idempotency_key        uuid,
  external_updated_at   timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (source, external_order_id)
);

create index idx_patient_orders_patient
  on public.patient_orders (patient_id, ordered_at desc);
create index idx_patient_orders_clinic
  on public.patient_orders (customer_code, ordered_at desc);
create unique index idx_patient_orders_idempotency
  on public.patient_orders (customer_code, idempotency_key)
  where idempotency_key is not null;

create trigger trg_patient_orders_updated_at
  before update on public.patient_orders
  for each row execute function public.set_updated_at_generic();

-- 商品マスタ更新後も過去注文の名称・価格・注意事項が変わらないよう、注文時点の値を保存する。
create table public.patient_order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.patient_orders (id) on delete cascade,
  product_id            uuid references public.products (id) on delete set null,
  product_name          text not null,
  unit_price            integer not null check (unit_price >= 0),
  quantity              integer not null default 1 check (quantity > 0),
  unit_snapshot         text,
  image_type_snapshot   text not null default 'supplement'
                          check (image_type_snapshot in ('supplement','yogurt','toothbrush','oral')),
  image_url_snapshot    text,
  daily_amount_snapshot text,
  volume_snapshot       text,
  caution_snapshot      text,
  external_line_item_id text,
  created_at            timestamptz not null default now()
);

create index idx_patient_order_items_order_id
  on public.patient_order_items (order_id);

-- 医院または患者が所有する送り先マスタ。所有者は実FKのどちらか一方だけとし、
-- owner_type/owner_idの疑似外部キーを使わず参照整合性をDBで保証する。
create table public.delivery_destinations (
  id                    uuid primary key default gen_random_uuid(),
  clinic_customer_code  text references public.clinics (customer_code) on delete restrict,
  patient_id            uuid references public.patients (id) on delete restrict,
  label                 text not null check (length(btrim(label)) between 1 and 50),
  postal_code           text not null check (postal_code ~ '^[0-9]{3}-[0-9]{4}$'),
  prefecture            text not null check (length(prefecture) between 2 and 4),
  city                  text not null check (length(city) between 1 and 100),
  address_line1         text not null check (length(address_line1) between 1 and 200),
  address_line2         text check (address_line2 is null or length(address_line2) <= 200),
  recipient_name        text not null check (length(recipient_name) between 1 and 100),
  phone                 text not null check (
                          phone ~ '^[0-9+() -]{8,30}$'
                          and length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 15
                        ),
  is_default            boolean not null default false,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (num_nonnulls(clinic_customer_code, patient_id) = 1)
);

create index idx_delivery_destinations_clinic_active
  on public.delivery_destinations (clinic_customer_code, created_at)
  where deleted_at is null and clinic_customer_code is not null;
create index idx_delivery_destinations_patient_active
  on public.delivery_destinations (patient_id, created_at)
  where deleted_at is null and patient_id is not null;
create unique index idx_delivery_destinations_clinic_default
  on public.delivery_destinations (clinic_customer_code)
  where deleted_at is null and is_default and clinic_customer_code is not null;
create unique index idx_delivery_destinations_patient_default
  on public.delivery_destinations (patient_id)
  where deleted_at is null and is_default and patient_id is not null;

create trigger trg_delivery_destinations_updated_at
  before update on public.delivery_destinations
  for each row execute function public.set_updated_at_generic();

-- 注文時点の送り先スナップショット。医院受け取り・自宅配送の両方で1行を作り、
-- マスタが後日変更・論理削除されても過去注文の送り先を不変に保つ。
create table public.order_delivery_destinations (
  order_id               uuid primary key references public.patient_orders (id) on delete cascade,
  delivery_destination_id uuid not null references public.delivery_destinations (id) on delete restrict,
  label                  text not null check (length(btrim(label)) between 1 and 50),
  postal_code            text not null check (postal_code ~ '^[0-9]{3}-[0-9]{4}$'),
  prefecture             text not null check (length(prefecture) between 2 and 4),
  city                   text not null check (length(city) between 1 and 100),
  address_line1          text not null check (length(address_line1) between 1 and 200),
  address_line2          text check (address_line2 is null or length(address_line2) <= 200),
  recipient_name         text not null check (length(recipient_name) between 1 and 100),
  phone                  text not null check (
                           phone ~ '^[0-9+() -]{8,30}$'
                           and length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 15
                         ),
  created_at             timestamptz not null default now()
);

create index idx_order_delivery_destinations_source
  on public.order_delivery_destinations (delivery_destination_id);

create or replace function public.guard_delivery_destination_delete()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception '送り先は物理削除できません。';
  end if;
  if old.clinic_customer_code is distinct from new.clinic_customer_code
     or old.patient_id is distinct from new.patient_id then
    raise exception '送り先の所有者は変更できません。';
  end if;
  if old.deleted_at is null and new.deleted_at is not null and exists (
    select 1
      from public.order_delivery_destinations snapshot
      join public.patient_orders orders on orders.id = snapshot.order_id
     where snapshot.delivery_destination_id = old.id
       and orders.status not in ('completed', 'canceled')
  ) then
    raise exception '進行中の注文で使用している送り先は削除できません。';
  end if;
  return new;
end;
$$;

create trigger trg_delivery_destinations_guard_update
  before update of clinic_customer_code, patient_id, deleted_at on public.delivery_destinations
  for each row execute function public.guard_delivery_destination_delete();
create trigger trg_delivery_destinations_guard_delete
  before delete on public.delivery_destinations
  for each row execute function public.guard_delivery_destination_delete();

create or replace function public.create_delivery_destination(
  p_clinic_customer_code text,
  p_patient_id uuid,
  p_label text,
  p_postal_code text,
  p_prefecture text,
  p_city text,
  p_address_line1 text,
  p_address_line2 text,
  p_recipient_name text,
  p_phone text,
  p_is_default boolean
)
returns public.delivery_destinations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destination public.delivery_destinations%rowtype;
  v_make_default boolean;
begin
  if num_nonnulls(p_clinic_customer_code, p_patient_id) <> 1 then
    raise exception '送り先の所有者が不正です。';
  end if;
  if p_patient_id is not null and not exists (
    select 1 from public.patients
     where id = p_patient_id and status = '有効'
  ) then
    raise exception '患者が見つかりません。';
  end if;
  if p_clinic_customer_code is not null and not exists (
    select 1 from public.clinics where customer_code = p_clinic_customer_code
  ) then
    raise exception '医院が見つかりません。';
  end if;

  v_make_default := coalesce(p_is_default, false) or not exists (
    select 1 from public.delivery_destinations
     where deleted_at is null
       and ((p_patient_id is not null and patient_id = p_patient_id)
         or (p_clinic_customer_code is not null and clinic_customer_code = p_clinic_customer_code))
  );

  if v_make_default then
    update public.delivery_destinations
       set is_default = false
     where deleted_at is null
       and ((p_patient_id is not null and patient_id = p_patient_id)
         or (p_clinic_customer_code is not null and clinic_customer_code = p_clinic_customer_code));
  end if;

  insert into public.delivery_destinations (
    clinic_customer_code, patient_id, label, postal_code, prefecture, city,
    address_line1, address_line2, recipient_name, phone, is_default
  ) values (
    p_clinic_customer_code, p_patient_id, btrim(p_label), p_postal_code,
    btrim(p_prefecture), btrim(p_city), btrim(p_address_line1),
    nullif(btrim(p_address_line2), ''), btrim(p_recipient_name), btrim(p_phone),
    v_make_default
  ) returning * into v_destination;
  return v_destination;
end;
$$;

create or replace function public.set_default_delivery_destination(p_destination_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destination public.delivery_destinations%rowtype;
begin
  select * into v_destination from public.delivery_destinations
   where id = p_destination_id and deleted_at is null for update;
  if not found then raise exception '送り先が見つかりません。'; end if;
  update public.delivery_destinations set is_default = false
   where deleted_at is null and id <> v_destination.id
     and ((v_destination.patient_id is not null and patient_id = v_destination.patient_id)
       or (v_destination.clinic_customer_code is not null and clinic_customer_code = v_destination.clinic_customer_code));
  update public.delivery_destinations set is_default = true where id = v_destination.id;
end;
$$;

create or replace function public.archive_delivery_destination(p_destination_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destination public.delivery_destinations%rowtype;
  v_replacement_id uuid;
begin
  select * into v_destination from public.delivery_destinations
   where id = p_destination_id and deleted_at is null for update;
  if not found then raise exception '送り先が見つかりません。'; end if;

  update public.delivery_destinations
     set deleted_at = now(), is_default = false
   where id = v_destination.id;

  if v_destination.is_default then
    select id into v_replacement_id from public.delivery_destinations
     where deleted_at is null
       and ((v_destination.patient_id is not null and patient_id = v_destination.patient_id)
         or (v_destination.clinic_customer_code is not null and clinic_customer_code = v_destination.clinic_customer_code))
     order by created_at, id limit 1;
    if v_replacement_id is not null then
      update public.delivery_destinations set is_default = true where id = v_replacement_id;
    end if;
  end if;
end;
$$;

-- 受注の登録・状態変更を追跡する監査履歴。操作者はNextAuth側で管理されるため、
-- 発生時点の識別子（メールアドレス等）を履歴事実として保存する。
create table public.patient_order_events (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.patient_orders (id) on delete cascade,
  event_type            text not null check (event_type in ('created','status_changed')),
  actor_type             text not null check (actor_type in ('bgj','clinic','system','external')),
  actor_identifier       text not null,
  from_status            text check (from_status is null or from_status in ('received','preparing','ready','shipped','completed','canceled')),
  to_status              text check (to_status is null or to_status in ('received','preparing','ready','shipped','completed','canceled')),
  created_at             timestamptz not null default now()
);

create index idx_patient_order_events_order_id
  on public.patient_order_events (order_id, created_at);

-- 医院・BGJの注文登録を共通化する。JSONは複数明細の入力境界だけに使用し、
-- 注文・明細・配送先・監査履歴は正規化テーブルへ1トランザクションで保存する。
create or replace function public.create_portal_patient_order(
  p_customer_code text,
  p_patient_id uuid,
  p_items jsonb,
  p_fulfillment_method text,
  p_delivery_destination_id uuid,
  p_idempotency_key uuid,
  p_created_via text,
  p_actor_type text,
  p_actor_identifier text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item_count integer;
  v_distinct_product_count integer;
  v_available_product_count integer;
  v_destination public.delivery_destinations%rowtype;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception '商品は1〜50種類で指定してください。';
  end if;
  if p_fulfillment_method not in ('pickup', 'delivery') then
    raise exception '受け取り方法が不正です。';
  end if;
  if not (
    (p_created_via = 'clinic_portal' and p_actor_type = 'clinic') or
    (p_created_via = 'bgj_portal' and p_actor_type = 'bgj')
  ) then
    raise exception '登録経路が不正です。';
  end if;
  if nullif(btrim(p_actor_identifier), '') is null or length(p_actor_identifier) > 320 then
    raise exception '操作者が不正です。';
  end if;
  select id into v_order_id
    from public.patient_orders
   where customer_code = p_customer_code and idempotency_key = p_idempotency_key;
  if v_order_id is not null then return v_order_id; end if;

  if not exists (
    select 1 from public.patients
     where id = p_patient_id and customer_code = p_customer_code and status = '有効'
  ) then
    raise exception '患者が見つかりません。';
  end if;

  select * into v_destination
    from public.delivery_destinations
   where id = p_delivery_destination_id and deleted_at is null
   for share;
  if not found then raise exception '送り先が見つかりません。'; end if;
  if p_fulfillment_method = 'pickup'
     and v_destination.clinic_customer_code is distinct from p_customer_code then
    raise exception '医院受け取りでは注文医院の送り先を選択してください。';
  end if;
  if p_fulfillment_method = 'delivery'
     and v_destination.patient_id is distinct from p_patient_id then
    raise exception '自宅配送では注文患者の送り先を選択してください。';
  end if;

  with requested_items as (
    select (item->>'productId')::uuid as product_id,
           (item->>'quantity')::integer as quantity
      from jsonb_array_elements(p_items) as item
  )
  select count(*), count(distinct product_id)
    into v_item_count, v_distinct_product_count
    from requested_items
   where quantity between 1 and 100;
  if v_item_count <> jsonb_array_length(p_items) or v_distinct_product_count <> v_item_count then
    raise exception '商品または数量が不正です。';
  end if;

  with requested_items as (
    select (item->>'productId')::uuid as product_id
      from jsonb_array_elements(p_items) as item
  )
  select count(*) into v_available_product_count
    from requested_items requested
    join public.products product on product.id = requested.product_id and product.status = '公開'
   where not exists (
     select 1 from public.clinic_product_settings setting
      where setting.customer_code = p_customer_code
        and setting.product_id = requested.product_id
        and setting.is_visible = false
   );
  if v_available_product_count <> v_item_count then
    raise exception '選択できない商品が含まれています。';
  end if;

  begin
    insert into public.patient_orders (
      customer_code, patient_id, fulfillment_method, order_type, status,
      source, created_via, sync_status, idempotency_key
    ) values (
      p_customer_code, p_patient_id, p_fulfillment_method, 'one_time', 'received',
      'internal', p_created_via, 'local', p_idempotency_key
    ) returning id into v_order_id;
  exception when unique_violation then
    select id into v_order_id from public.patient_orders
     where customer_code = p_customer_code and idempotency_key = p_idempotency_key;
    if v_order_id is not null then return v_order_id; end if;
    raise;
  end;

  insert into public.patient_order_items (
    order_id, product_id, product_name, unit_price, quantity,
    unit_snapshot, image_type_snapshot, image_url_snapshot, daily_amount_snapshot,
    volume_snapshot, caution_snapshot
  )
  select v_order_id, product.id, product.name,
         coalesce(setting.clinic_price, product.price), requested.quantity,
         product.unit, product.image_type, product.image_url, product.daily_amount,
         product.volume, product.caution
    from jsonb_to_recordset(p_items) as requested("productId" uuid, quantity integer)
    join public.products product on product.id = requested."productId"
    left join public.clinic_product_settings setting
      on setting.customer_code = p_customer_code and setting.product_id = product.id;

  insert into public.order_delivery_destinations (
    order_id, delivery_destination_id, label, postal_code, prefecture, city,
    address_line1, address_line2, recipient_name, phone
  ) values (
    v_order_id, v_destination.id, v_destination.label, v_destination.postal_code,
    v_destination.prefecture, v_destination.city, v_destination.address_line1,
    v_destination.address_line2, v_destination.recipient_name, v_destination.phone
  );

  insert into public.patient_order_events (
    order_id, event_type, actor_type, actor_identifier, to_status
  ) values (
    v_order_id, 'created', p_actor_type, btrim(p_actor_identifier), 'received'
  );
  return v_order_id;
end;
$$;

revoke execute on function public.create_portal_patient_order(text, uuid, jsonb, text, uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_portal_patient_order(text, uuid, jsonb, text, uuid, uuid, text, text, text)
  to service_role;

revoke execute on function public.create_delivery_destination(text, uuid, text, text, text, text, text, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.create_delivery_destination(text, uuid, text, text, text, text, text, text, text, text, boolean)
  to service_role;
revoke execute on function public.set_default_delivery_destination(uuid), public.archive_delivery_destination(uuid)
  from public, anon, authenticated;
grant execute on function public.set_default_delivery_destination(uuid), public.archive_delivery_destination(uuid)
  to service_role;

-- 後方参照用の旧RPC。送り先IDを受け取らないため実行権限は付与しない。
create or replace function public.create_internal_patient_order(
  p_customer_code text,
  p_patient_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_fulfillment_method text,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_product public.products%rowtype;
begin
  if p_quantity < 1 or p_quantity > 100 then
    raise exception '数量は1〜100で指定してください。';
  end if;
  if p_fulfillment_method not in ('pickup', 'delivery') then
    raise exception '受け取り方法が不正です。';
  end if;

  select id into v_order_id
    from public.patient_orders
   where customer_code = p_customer_code and idempotency_key = p_idempotency_key;
  if v_order_id is not null then return v_order_id; end if;

  if not exists (
    select 1 from public.patients
     where id = p_patient_id and customer_code = p_customer_code and status = '有効'
  ) then
    raise exception '患者が見つかりません。';
  end if;

  select * into v_product from public.products
   where id = p_product_id and status = '公開';
  if not found or exists (
    select 1 from public.clinic_product_settings
     where customer_code = p_customer_code and product_id = p_product_id and is_visible = false
  ) then
    raise exception '商品が見つかりません。';
  end if;

  begin
    insert into public.patient_orders (
      customer_code, patient_id, fulfillment_method, order_type,
      status, source, sync_status, idempotency_key
    ) values (
      p_customer_code, p_patient_id, p_fulfillment_method, 'one_time',
      'received', 'internal', 'local', p_idempotency_key
    ) returning id into v_order_id;
  exception when unique_violation then
    select id into v_order_id from public.patient_orders
     where customer_code = p_customer_code and idempotency_key = p_idempotency_key;
    if v_order_id is not null then return v_order_id; end if;
    raise;
  end;

  insert into public.patient_order_items (
    order_id, product_id, product_name, unit_price, quantity,
    unit_snapshot, image_type_snapshot, image_url_snapshot, daily_amount_snapshot,
    volume_snapshot, caution_snapshot
  ) values (
    v_order_id, v_product.id, v_product.name,
    coalesce((select clinic_price from public.clinic_product_settings
              where customer_code = p_customer_code and product_id = v_product.id), v_product.price),
    p_quantity, v_product.unit, v_product.image_type, v_product.image_url, v_product.daily_amount,
    v_product.volume, v_product.caution
  );
  return v_order_id;
end;
$$;

revoke execute on function public.create_internal_patient_order(text, uuid, uuid, integer, text, uuid)
  from public, anon, authenticated, service_role;

-- 後方参照用の旧BGJ RPC。送り先IDを受け取らないため実行権限は付与しない。
create or replace function public.create_bgj_patient_order(
  p_customer_code text,
  p_patient_id uuid,
  p_items jsonb,
  p_idempotency_key uuid,
  p_actor_identifier text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item_count integer;
  v_distinct_product_count integer;
  v_available_product_count integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception '商品は1〜50種類で指定してください。';
  end if;
  if nullif(btrim(p_actor_identifier), '') is null or length(p_actor_identifier) > 320 then
    raise exception '操作者が不正です。';
  end if;

  select id into v_order_id
    from public.patient_orders
   where customer_code = p_customer_code and idempotency_key = p_idempotency_key;
  if v_order_id is not null then return v_order_id; end if;

  if not exists (
    select 1 from public.patients
     where id = p_patient_id and customer_code = p_customer_code and status = '有効'
  ) then
    raise exception '患者が見つかりません。';
  end if;

  with requested_items as (
    select (item->>'productId')::uuid as product_id,
           (item->>'quantity')::integer as quantity
      from jsonb_array_elements(p_items) as item
  )
  select count(*), count(distinct product_id)
    into v_item_count, v_distinct_product_count
    from requested_items
   where quantity between 1 and 100;

  if v_item_count <> jsonb_array_length(p_items) or v_distinct_product_count <> v_item_count then
    raise exception '商品または数量が不正です。';
  end if;

  with requested_items as (
    select (item->>'productId')::uuid as product_id
      from jsonb_array_elements(p_items) as item
  )
  select count(*) into v_available_product_count
    from requested_items requested
    join public.products product on product.id = requested.product_id and product.status = '公開'
   where not exists (
     select 1 from public.clinic_product_settings setting
      where setting.customer_code = p_customer_code
        and setting.product_id = requested.product_id
        and setting.is_visible = false
   );

  if v_available_product_count <> v_item_count then
    raise exception '選択できない商品が含まれています。';
  end if;

  begin
    insert into public.patient_orders (
      customer_code, patient_id, fulfillment_method, order_type, status,
      source, created_via, sync_status, idempotency_key
    ) values (
      p_customer_code, p_patient_id, 'pickup', 'one_time', 'received',
      'internal', 'bgj_portal', 'local', p_idempotency_key
    ) returning id into v_order_id;
  exception when unique_violation then
    select id into v_order_id from public.patient_orders
     where customer_code = p_customer_code and idempotency_key = p_idempotency_key;
    if v_order_id is not null then return v_order_id; end if;
    raise;
  end;

  insert into public.patient_order_items (
    order_id, product_id, product_name, unit_price, quantity,
    unit_snapshot, image_type_snapshot, image_url_snapshot, daily_amount_snapshot,
    volume_snapshot, caution_snapshot
  )
  select v_order_id, product.id, product.name,
         coalesce(setting.clinic_price, product.price), requested.quantity,
         product.unit, product.image_type, product.image_url, product.daily_amount,
         product.volume, product.caution
    from jsonb_to_recordset(p_items) as requested("productId" uuid, quantity integer)
    join public.products product on product.id = requested."productId"
    left join public.clinic_product_settings setting
      on setting.customer_code = p_customer_code and setting.product_id = product.id;

  insert into public.patient_order_events (
    order_id, event_type, actor_type, actor_identifier, to_status
  ) values (
    v_order_id, 'created', 'bgj', btrim(p_actor_identifier), 'received'
  );

  return v_order_id;
end;
$$;

revoke execute on function public.create_bgj_patient_order(text, uuid, jsonb, uuid, text)
  from public, anon, authenticated, service_role;

-- Shopify接続前の申込を、外部契約と実受注から分離して正規化保存する。
create table public.patient_subscription_requests (
  id uuid primary key default gen_random_uuid(),
  request_number bigint generated always as identity unique,
  customer_code text not null references public.clinics (customer_code) on delete restrict,
  patient_id uuid not null references public.patients (id) on delete restrict,
  term_months smallint not null check (term_months in (3, 6)),
  fulfillment_method text not null check (fulfillment_method in ('pickup', 'delivery')),
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected', 'canceled')),
  idempotency_key uuid not null,
  version integer not null default 1 check (version > 0),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_code, idempotency_key)
);
create index idx_subscription_requests_patient on public.patient_subscription_requests (patient_id, submitted_at desc);
create index idx_subscription_requests_bgj on public.patient_subscription_requests (status, submitted_at desc);
create trigger trg_subscription_requests_updated_at before update on public.patient_subscription_requests
  for each row execute function public.set_updated_at_generic();

create table public.patient_subscription_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.patient_subscription_requests (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 100),
  image_url_snapshot text,
  created_at timestamptz not null default now(),
  unique (request_id, product_id)
);
create index idx_subscription_request_items_request on public.patient_subscription_request_items (request_id);

create table public.patient_subscription_request_destinations (
  request_id uuid primary key references public.patient_subscription_requests (id) on delete cascade,
  delivery_destination_id uuid not null references public.delivery_destinations (id) on delete restrict,
  label text not null,
  postal_code text not null,
  prefecture text not null,
  city text not null,
  address_line1 text not null,
  address_line2 text,
  recipient_name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);
create index idx_subscription_request_destination_source
  on public.patient_subscription_request_destinations (delivery_destination_id);

create table public.patient_subscription_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.patient_subscription_requests (id) on delete cascade,
  event_type text not null check (event_type in ('submitted', 'approved', 'rejected', 'canceled')),
  actor_type text not null check (actor_type in ('patient', 'bgj', 'system')),
  actor_identifier text not null,
  from_status text check (from_status is null or from_status in ('submitted', 'approved', 'rejected', 'canceled')),
  to_status text not null check (to_status in ('submitted', 'approved', 'rejected', 'canceled')),
  reason text,
  created_at timestamptz not null default now()
);
create index idx_subscription_request_events_request on public.patient_subscription_request_events (request_id, created_at);

create or replace function public.create_patient_subscription_request(
  p_customer_code text, p_patient_id uuid, p_product_id uuid, p_quantity integer,
  p_term_months integer, p_fulfillment_method text, p_delivery_destination_id uuid,
  p_idempotency_key uuid, p_actor_identifier text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_request_id uuid;
  v_destination public.delivery_destinations%rowtype;
  v_product public.products%rowtype;
  v_unit_price integer;
begin
  select id into v_request_id from public.patient_subscription_requests
   where customer_code = p_customer_code and idempotency_key = p_idempotency_key;
  if v_request_id is not null then return v_request_id; end if;
  if p_quantity not between 1 and 100 or p_term_months not in (3, 6) or p_fulfillment_method not in ('pickup', 'delivery') then
    raise exception '申込内容が不正です。';
  end if;
  if nullif(btrim(p_actor_identifier), '') is null or length(p_actor_identifier) > 320 then raise exception '操作者が不正です。'; end if;
  if not exists (select 1 from public.patients where id = p_patient_id and customer_code = p_customer_code and status = '有効') then
    raise exception '患者が見つかりません。';
  end if;
  select product.* into v_product from public.products product
   where product.id = p_product_id and product.status = '公開' and product.subscription_available;
  if not found or exists (select 1 from public.clinic_product_settings setting
    where setting.customer_code = p_customer_code and setting.product_id = p_product_id and not setting.is_visible) then
    raise exception '選択できない商品です。';
  end if;
  select case p_term_months
      when 3 then coalesce(setting.subscription_3_month_price, setting.clinic_price, v_product.price)
      else coalesce(setting.subscription_6_month_price, setting.clinic_price, v_product.price)
    end into v_unit_price
    from (select 1) seed left join public.clinic_product_settings setting
      on setting.customer_code = p_customer_code and setting.product_id = p_product_id;
  select * into v_destination from public.delivery_destinations
   where id = p_delivery_destination_id and deleted_at is null for share;
  if not found then raise exception '送り先が見つかりません。'; end if;
  if p_fulfillment_method = 'pickup' and v_destination.clinic_customer_code is distinct from p_customer_code then
    raise exception '医院受け取りでは所属医院の送り先を選択してください。';
  end if;
  if p_fulfillment_method = 'delivery' and v_destination.patient_id is distinct from p_patient_id then
    raise exception '自宅配送では本人の送り先を選択してください。';
  end if;
  begin
    insert into public.patient_subscription_requests (customer_code, patient_id, term_months, fulfillment_method, idempotency_key)
    values (p_customer_code, p_patient_id, p_term_months, p_fulfillment_method, p_idempotency_key)
    returning id into v_request_id;
  exception when unique_violation then
    select id into v_request_id from public.patient_subscription_requests
     where customer_code = p_customer_code and idempotency_key = p_idempotency_key;
    if v_request_id is not null then return v_request_id; end if;
    raise;
  end;
  insert into public.patient_subscription_request_items
    (request_id, product_id, product_name, unit_price, quantity, image_url_snapshot)
  values (v_request_id, v_product.id, v_product.name, v_unit_price, p_quantity, v_product.image_url);
  insert into public.patient_subscription_request_destinations
    (request_id, delivery_destination_id, label, postal_code, prefecture, city, address_line1, address_line2, recipient_name, phone)
  values (v_request_id, v_destination.id, v_destination.label, v_destination.postal_code,
    v_destination.prefecture, v_destination.city, v_destination.address_line1,
    v_destination.address_line2, v_destination.recipient_name, v_destination.phone);
  insert into public.patient_subscription_request_events (request_id, event_type, actor_type, actor_identifier, to_status)
  values (v_request_id, 'submitted', 'patient', btrim(p_actor_identifier), 'submitted');
  return v_request_id;
end;
$$;

create or replace function public.transition_patient_subscription_request(
  p_request_id uuid, p_expected_version integer, p_to_status text, p_actor_type text,
  p_actor_identifier text, p_reason text
) returns public.patient_subscription_requests language plpgsql security definer set search_path = public as $$
declare
  v_current public.patient_subscription_requests%rowtype;
  v_updated public.patient_subscription_requests%rowtype;
begin
  select * into v_current from public.patient_subscription_requests where id = p_request_id for update;
  if not found then raise exception '申込が見つかりません。'; end if;
  if v_current.version <> p_expected_version then raise exception '更新競合が発生しました。'; end if;
  if p_actor_type not in ('patient', 'bgj', 'system') or nullif(btrim(p_actor_identifier), '') is null then raise exception '操作者が不正です。'; end if;
  if not ((v_current.status = 'submitted' and p_to_status in ('approved', 'rejected', 'canceled')) or
    (v_current.status = 'approved' and p_to_status = 'canceled' and p_actor_type in ('bgj', 'system'))) then
    raise exception '許可されていない状態遷移です。';
  end if;
  if p_actor_type = 'patient' and (v_current.status <> 'submitted' or p_to_status <> 'canceled') then
    raise exception '患者が取り消せるのは受付中の申込だけです。';
  end if;
  if p_to_status = 'rejected' and nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception '却下理由を入力してください。'; end if;
  update public.patient_subscription_requests set
    status = p_to_status, version = version + 1,
    reviewed_at = case when p_to_status in ('approved', 'rejected') then now() else reviewed_at end,
    canceled_at = case when p_to_status = 'canceled' then now() else canceled_at end
   where id = p_request_id returning * into v_updated;
  insert into public.patient_subscription_request_events
    (request_id, event_type, actor_type, actor_identifier, from_status, to_status, reason)
  values (p_request_id, p_to_status, p_actor_type, btrim(p_actor_identifier), v_current.status, p_to_status,
    nullif(btrim(coalesce(p_reason, '')), ''));
  return v_updated;
end;
$$;

-- 注文だけでなく、受付中・承認済みの定期購入申込も送り先削除の保護対象にする。
create or replace function public.guard_delivery_destination_delete()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception '送り先は物理削除できません。'; end if;
  if old.clinic_customer_code is distinct from new.clinic_customer_code or old.patient_id is distinct from new.patient_id then
    raise exception '送り先の所有者は変更できません。';
  end if;
  if old.deleted_at is null and new.deleted_at is not null and (
    exists (select 1 from public.order_delivery_destinations snapshot join public.patient_orders orders on orders.id = snapshot.order_id
      where snapshot.delivery_destination_id = old.id and orders.status not in ('completed', 'canceled'))
    or exists (select 1 from public.patient_subscription_request_destinations snapshot
      join public.patient_subscription_requests request on request.id = snapshot.request_id
      where snapshot.delivery_destination_id = old.id and request.status in ('submitted', 'approved'))
  ) then raise exception '進行中の注文または定期購入申込で使用している送り先は削除できません。'; end if;
  return new;
end;
$$;

revoke execute on function public.create_patient_subscription_request(text, uuid, uuid, integer, integer, text, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.create_patient_subscription_request(text, uuid, uuid, integer, integer, text, uuid, uuid, text)
  to service_role;
revoke execute on function public.transition_patient_subscription_request(uuid, integer, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.transition_patient_subscription_request(uuid, integer, text, text, text, text)
  to service_role;

create trigger trg_clinic_product_settings_updated_at
  before update on public.clinic_product_settings
  for each row execute function public.set_updated_at_generic();

-- ============================================================
-- 10. RLS：原則ポリシーを一切定義せず有効化するのみ。
--    anon/authenticated からは読み書き一切不可。service_role キーのみアクセス可能。
--    ※ patients / periodontal_diagnoses / periodontal_stages / periodontal_grades の
--      4テーブルのみ、フェーズ3b（ハイブリッドJWT方式）で例外的にポリシーを持つ。
--      詳細は11節を参照。それ以外のテーブルはこの原則のまま。
-- ============================================================
alter table public.periodontal_stages     enable row level security;
alter table public.periodontal_grades     enable row level security;
alter table public.staff_roles            enable row level security;
alter table public.staff_areas            enable row level security;
alter table public.bgj_external_links     enable row level security;
alter table public.sales_reps             enable row level security;
alter table public.clinic_statuses        enable row level security;
alter table public.clinics                enable row level security;
alter table public.clinic_patient_settings enable row level security;
alter table public.clinic_intro_info      enable row level security;
alter table public.clinic_orders          enable row level security;
alter table public.clinic_visits          enable row level security;
alter table public.patients               enable row level security;
alter table public.periodontal_diagnoses  enable row level security;
alter table public.clinic_terms           enable row level security;
alter table public.clinic_users           enable row level security;
alter table public.clinic_login_tokens    enable row level security;
alter table public.clinic_staff           enable row level security;
alter table public.clinic_qa              enable row level security;
alter table public.clinic_email_templates enable row level security;
alter table public.patient_login_tokens   enable row level security;
alter table public.app_settings           enable row level security;
alter table public.clinic_inquiries       enable row level security;
alter table public.clinic_inquiry_replies enable row level security;
alter table public.clinic_announcements   enable row level security;
alter table public.products               enable row level security;
alter table public.clinic_product_settings enable row level security;
alter table public.patient_orders          enable row level security;
alter table public.patient_order_items     enable row level security;
alter table public.delivery_destinations   enable row level security;
alter table public.order_delivery_destinations enable row level security;
alter table public.patient_order_events    enable row level security;
alter table public.patient_subscription_requests enable row level security;
alter table public.patient_subscription_request_items enable row level security;
alter table public.patient_subscription_request_destinations enable row level security;
alter table public.patient_subscription_request_events enable row level security;

-- ============================================================
-- 11. フェーズ3b：患者ポータルの歯周病診断読み取り経路のみ、
--    service_roleではなくNextAuthセッション由来のJWT（anonキー相当）で
--    Postgresに接続し、本物のRLSポリシーでDBレベルの多層防御を効かせる。
--    詳細: src/lib/auth/scopedSupabaseClient.ts
--    （他のテーブルはservice_role限定のまま。3a監査でアプリ層の認可は
--    確認済みのため対象外。将来必要になれば同じ手法で拡張できる）
-- ============================================================
create policy "authenticated can read stages" on public.periodontal_stages
  for select using (true);
create policy "authenticated can read grades" on public.periodontal_grades
  for select using (true);

create policy "scoped read on patients" on public.patients
  for select using (
    (auth.jwt() ->> 'app_role') = 'bgj'
    or customer_code = (auth.jwt() ->> 'customer_code')
    or id = ((auth.jwt() ->> 'patient_id')::uuid)
  );

-- password_hashは列単位でも見せない（RLSに加えた多層防御）
revoke select on public.patients from authenticated, anon;
grant select (id, customer_code, patient_no, name, login_id, status, registered_at, created_at, updated_at)
  on public.patients to authenticated;

create policy "scoped read on diagnoses" on public.periodontal_diagnoses
  for select using (
    (auth.jwt() ->> 'app_role') = 'bgj'
    or patient_id = ((auth.jwt() ->> 'patient_id')::uuid)
    or patient_id in (
      select id from public.patients where customer_code = (auth.jwt() ->> 'customer_code')
    )
  );

-- ============================================================
-- システム管理（BGJポータル）：DB使用量の概況
-- pg_class/pg_namespaceはユーザーデータではなくスキーマメタデータのため、
-- 新規テーブルではなくRLS/ポリシーの対象外。Supabase Management APIのような
-- 追加の認証情報を必要とせず、Postgres内だけで完結させている。
-- ============================================================
create or replace function public.bgj_db_total_size()
returns bigint
language sql
stable
as $$
  select pg_database_size(current_database());
$$;

create or replace function public.bgj_db_table_usage()
returns table (table_name text, size_bytes bigint, row_estimate bigint)
language sql
stable
as $$
  select
    c.relname as table_name,
    pg_total_relation_size(c.oid) as size_bytes,
    c.reltuples::bigint as row_estimate
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by size_bytes desc;
$$;

-- ============================================================
-- 医院ダッシュボード／コミッション用集計
-- 内部注文は参考金額とし、Shopify連携前の確定値はnullで返す。
-- ============================================================
create or replace function public.get_admin_overview(p_customer_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
month_bounds as (
  select date_trunc('month', timezone('Asia/Tokyo', now()))::date as current_month_start
),
months as (
  select generate_series(
    (select current_month_start from month_bounds) - interval '5 months',
    (select current_month_start from month_bounds),
    interval '1 month'
  )::date as month_start
),
monthly_internal as (
  select
    date_trunc('month', o.ordered_at at time zone 'Asia/Tokyo')::date as month_start,
    count(distinct o.id)::bigint as order_count,
    coalesce(sum(i.unit_price::bigint * i.quantity), 0)::bigint as reference_amount
  from public.patient_orders o
  join public.patient_order_items i on i.order_id = o.id
  where o.customer_code = p_customer_code
    and o.source = 'internal'
    and o.status <> 'canceled'
    and o.ordered_at >= (
      (select min(month_start) from months)::timestamp at time zone 'Asia/Tokyo'
    )
  group by 1
),
current_product_rows as (
  select
    i.product_name,
    sum(i.quantity)::bigint as quantity,
    sum(i.unit_price::bigint * i.quantity)::bigint as reference_amount
  from public.patient_orders o
  join public.patient_order_items i on i.order_id = o.id
  cross join month_bounds b
  where o.customer_code = p_customer_code
    and o.source = 'internal'
    and o.status <> 'canceled'
    and o.ordered_at >= (b.current_month_start::timestamp at time zone 'Asia/Tokyo')
    and o.ordered_at < ((b.current_month_start + interval '1 month')::timestamp at time zone 'Asia/Tokyo')
  group by i.product_name
  order by reference_amount desc, i.product_name
),
recent_order_rows as (
  select
    o.id,
    o.ordered_at,
    o.fulfillment_method,
    o.status,
    o.order_type,
    o.source,
    p.name as patient_name,
    coalesce((
      select string_agg(
        oi.product_name || ' × ' || oi.quantity::text,
        '、' order by oi.created_at
      )
      from public.patient_order_items oi
      where oi.order_id = o.id
    ), '商品情報なし') as product_summary
  from public.patient_orders o
  join public.patients p on p.id = o.patient_id
  where o.customer_code = p_customer_code
  order by o.ordered_at desc
  limit 4
),
recent_announcement_rows as (
  select a.id, a.announcement_date, a.tag, a.text
  from public.clinic_announcements a
  where a.customer_code = p_customer_code and a.status = '公開'
  order by a.announcement_date desc, a.created_at desc
  limit 3
)
select jsonb_build_object(
  'generatedAt', now(),
  'counts', jsonb_build_object(
    'patientCount', (
      select count(*) from public.patients p
      where p.customer_code = p_customer_code and p.status = '有効'
    ),
    'publishedAnnouncementCount', (
      select count(*) from public.clinic_announcements a
      where a.customer_code = p_customer_code and a.status = '公開'
    ),
    'activeOrderCount', (
      select count(*) from public.patient_orders o
      where o.customer_code = p_customer_code
        and o.status in ('received', 'preparing', 'ready', 'shipped')
    ),
    'visibleProductCount', (
      select count(*)
      from public.products pr
      where pr.status = '公開'
        and not exists (
          select 1 from public.clinic_product_settings s
          where s.customer_code = p_customer_code
            and s.product_id = pr.id
            and s.is_visible = false
        )
    )
  ),
  'recentOrders', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'orderedAt', r.ordered_at,
      'fulfillmentMethod', r.fulfillment_method,
      'status', r.status,
      'orderType', r.order_type,
      'source', r.source,
      'patientName', r.patient_name,
      'productSummary', r.product_summary
    ) order by r.ordered_at desc), '[]'::jsonb)
    from recent_order_rows r
  ),
  'recentAnnouncements', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'announcementDate', r.announcement_date,
      'tag', r.tag,
      'text', r.text
    ) order by r.announcement_date desc), '[]'::jsonb)
    from recent_announcement_rows r
  ),
  'commerce', jsonb_build_object(
    'integrationStatus', 'awaiting_shopify',
    'commissionRate', (
      select t.commission_rate from public.clinic_terms t
      where t.customer_code = p_customer_code
    ),
    'currentMonth', jsonb_build_object(
      'internalOrderCount', coalesce((
        select m.order_count from monthly_internal m
        where m.month_start = (select current_month_start from month_bounds)
      ), 0),
      'internalOrderAmount', coalesce((
        select m.reference_amount from monthly_internal m
        where m.month_start = (select current_month_start from month_bounds)
      ), 0),
      'confirmedSales', null,
      'confirmedCommission', null
    ),
    'monthly', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'month', to_char(m.month_start, 'YYYY-MM'),
        'label', extract(month from m.month_start)::integer::text || '月',
        'internalOrderCount', coalesce(a.order_count, 0),
        'internalOrderAmount', coalesce(a.reference_amount, 0),
        'confirmedSales', null,
        'confirmedCommission', null
      ) order by m.month_start), '[]'::jsonb)
      from months m
      left join monthly_internal a on a.month_start = m.month_start
    ),
    'products', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'productName', p.product_name,
        'quantity', p.quantity,
        'internalOrderAmount', p.reference_amount,
        'confirmedSales', null,
        'confirmedCommission', null
      ) order by p.reference_amount desc, p.product_name), '[]'::jsonb)
      from current_product_rows p
    )
  )
);
$$;

revoke execute on function public.get_admin_overview(text)
  from public, anon, authenticated;
grant execute on function public.get_admin_overview(text)
  to service_role;

-- BGJダッシュボード（/bgj/dashboard）の固定配列を廃止し、実データ集計を1回のRPCで返す。
-- 閾値はapp_settingsから呼び出し側（route.ts）が取得して渡す。
create or replace function public.get_bgj_dashboard_overview(
  p_followup_days integer,
  p_dormant_days integer,
  p_include_never_ordered boolean
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
month_bounds as (
  select date_trunc('month', current_date)::date as current_month_start
),
months as (
  select generate_series(
    (select current_month_start from month_bounds) - interval '5 months',
    (select current_month_start from month_bounds),
    interval '1 month'
  )::date as month_start
),
clinic_last_order as (
  select
    c.customer_code,
    c.name,
    c.staff_id,
    c.contract_since,
    max(o.order_date) as last_order_date
  from public.clinics c
  left join public.clinic_orders o on o.customer_code = c.customer_code
  group by c.customer_code, c.name, c.staff_id, c.contract_since
),
clinic_follow_status as (
  select
    l.*,
    case
      when l.last_order_date is not null then current_date - l.last_order_date
      when p_include_never_ordered and l.contract_since is not null then current_date - l.contract_since
      else null
    end as days_since_order
  from clinic_last_order l
),
monthly_orders as (
  select
    date_trunc('month', o.order_date)::date as month_start,
    c.staff_id,
    sum(o.amount)::bigint as amount
  from public.clinic_orders o
  join public.clinics c on c.customer_code = o.customer_code
  where o.order_date >= (select min(month_start) from months)
  group by 1, 2
),
staff_list as (
  select id as staff_id, name as staff_name from public.sales_reps
  union all
  select null::uuid, '担当未割当'
),
clinic_month_sales as (
  select
    customer_code,
    coalesce(sum(amount) filter (
      where date_trunc('month', order_date) = (select current_month_start from month_bounds)
    ), 0)::bigint as current_month_amount,
    coalesce(sum(amount) filter (
      where date_trunc('month', order_date) = (select current_month_start from month_bounds) - interval '1 month'
    ), 0)::bigint as prev_month_amount
  from public.clinic_orders
  group by customer_code
),
recent_order_rows as (
  select
    o.id,
    o.customer_code,
    c.name as clinic_name,
    coalesce(sr.name, '担当未割当') as staff_name,
    o.amount,
    o.order_date
  from public.clinic_orders o
  join public.clinics c on c.customer_code = o.customer_code
  left join public.sales_reps sr on sr.id = c.staff_id
  order by o.order_date desc, o.created_at desc
  limit 5
),
ranking_rows as (
  select
    c.customer_code,
    c.name as clinic_name,
    coalesce(sr.name, '担当未割当') as staff_name,
    s.current_month_amount,
    case
      when s.prev_month_amount is null or s.prev_month_amount = 0 then null
      else round((s.current_month_amount - s.prev_month_amount) / s.prev_month_amount::numeric * 100, 1)
    end as growth_pct
  from public.clinics c
  join clinic_month_sales s on s.customer_code = c.customer_code
  left join public.sales_reps sr on sr.id = c.staff_id
  where s.current_month_amount > 0
  order by s.current_month_amount desc
  limit 5
),
alert_rows as (
  select
    f.customer_code,
    f.name,
    f.days_since_order,
    case
      when f.days_since_order is not null and f.days_since_order >= p_dormant_days then 'high'
      when f.days_since_order is not null and f.days_since_order >= p_followup_days then 'medium'
      when f.staff_id is null then 'medium'
      else null
    end as level,
    array_remove(array[
      case when f.days_since_order is not null and f.days_since_order >= p_followup_days
        then f.days_since_order::text || '日以上未注文' end,
      case when f.staff_id is null then '担当未割当' end
    ], null) as issue_parts
  from clinic_follow_status f
),
alert_final as (
  select customer_code, name, level, days_since_order,
    array_to_string(issue_parts, '・') as issue
  from alert_rows
  where level is not null
  order by (level = 'high') desc, days_since_order desc nulls last
  limit 20
)
select jsonb_build_object(
  'generatedAt', now(),
  'kpis', jsonb_build_object(
    'totalClinicCount', (select count(*) from public.clinics),
    'totalClinicCountDelta', (
      select count(*) from public.clinics
      where contract_since >= (select current_month_start from month_bounds)
    ),
    'currentMonthSalesTotal', (
      select coalesce(sum(current_month_amount), 0) from clinic_month_sales
    ),
    'currentMonthSalesGrowthPct', (
      select case
        when sum(prev_month_amount) is null or sum(prev_month_amount) = 0 then null
        else round((sum(current_month_amount) - sum(prev_month_amount)) / sum(prev_month_amount)::numeric * 100, 1)
      end
      from clinic_month_sales
    ),
    'followUpCount', (
      select count(*) from clinic_follow_status
      where days_since_order is not null and days_since_order >= p_followup_days
    ),
    'dormantRiskCount', (
      select count(*) from clinic_follow_status
      where days_since_order is not null and days_since_order >= p_dormant_days
    )
  ),
  'alerts', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'customerCode', a.customer_code,
      'name', a.name,
      'level', a.level,
      'issue', a.issue,
      'daysSinceLastOrder', a.days_since_order
    )), '[]'::jsonb)
    from alert_final a
  ),
  'monthlySales', jsonb_build_object(
    'months', (
      select jsonb_agg(jsonb_build_object(
        'month', to_char(m.month_start, 'YYYY-MM'),
        'label', extract(month from m.month_start)::integer::text || '月'
      ) order by m.month_start)
      from months m
    ),
    'overall', (
      select jsonb_agg(coalesce(mo.amount, 0) order by m.month_start)
      from months m
      left join (
        select month_start, sum(amount)::bigint as amount from monthly_orders group by month_start
      ) mo on mo.month_start = m.month_start
    ),
    'byStaff', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'staffId', sl.staff_id,
        'staffName', sl.staff_name,
        'values', (
          select jsonb_agg(coalesce(mo.amount, 0) order by m.month_start)
          from months m
          left join monthly_orders mo
            on mo.month_start = m.month_start
            and mo.staff_id is not distinct from sl.staff_id
        )
      )), '[]'::jsonb)
      from staff_list sl
    )
  ),
  'recentOrders', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'customerCode', r.customer_code,
      'clinicName', r.clinic_name,
      'staffName', r.staff_name,
      'amount', r.amount,
      'orderDate', r.order_date
    )), '[]'::jsonb)
    from recent_order_rows r
  ),
  'ranking', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'customerCode', r.customer_code,
      'clinicName', r.clinic_name,
      'staffName', r.staff_name,
      'currentMonthAmount', r.current_month_amount,
      'growthPct', r.growth_pct
    )), '[]'::jsonb)
    from ranking_rows r
  )
);
$$;

revoke execute on function public.get_bgj_dashboard_overview(integer, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.get_bgj_dashboard_overview(integer, integer, boolean)
  to service_role;

-- BGJレポート（/bgj/reports）の固定配列を廃止し、実データ集計を1回のRPCで返す。
-- p_monthsはapp_settings.report_period_monthsから呼び出し側が取得して渡す。
create or replace function public.get_bgj_sales_report(p_months integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
month_bounds as (
  select date_trunc('month', current_date)::date as current_month_start
),
months as (
  select generate_series(
    (select current_month_start from month_bounds) - (p_months - 1) * interval '1 month',
    (select current_month_start from month_bounds),
    interval '1 month'
  )::date as month_start
),
window_orders as (
  select o.customer_code, o.order_date, o.amount, c.staff_id, c.area
  from public.clinic_orders o
  join public.clinics c on c.customer_code = o.customer_code
  where o.order_date >= (select min(month_start) from months)
    and o.order_date < (select current_month_start from month_bounds) + interval '1 month'
),
prev_year_orders as (
  select o.amount
  from public.clinic_orders o
  where o.order_date >= (select min(month_start) from months) - interval '1 year'
    and o.order_date < ((select current_month_start from month_bounds) + interval '1 month') - interval '1 year'
),
monthly_trend_rows as (
  select
    m.month_start,
    coalesce(sum(w.amount), 0)::bigint as sales_amount,
    count(w.customer_code) as order_count
  from months m
  left join window_orders w on date_trunc('month', w.order_date)::date = m.month_start
  group by m.month_start
),
staff_list as (
  select id as staff_id, name as staff_name from public.sales_reps
  union all
  select null::uuid, '担当未割当'
),
staff_clinic_count as (
  select staff_id, count(*) as clinic_count from public.clinics group by staff_id
),
staff_month_sales as (
  select c.staff_id, coalesce(sum(o.amount), 0)::bigint as amount
  from public.clinics c
  join public.clinic_orders o on o.customer_code = c.customer_code
  where date_trunc('month', o.order_date) = (select current_month_start from month_bounds)
  group by c.staff_id
),
staff_month_visits as (
  select c.staff_id, count(*) as visit_count
  from public.clinics c
  join public.clinic_visits v on v.customer_code = c.customer_code
  where date_trunc('month', v.visit_date) = (select current_month_start from month_bounds)
  group by c.staff_id
),
area_rollup as (
  select
    c.area,
    count(distinct c.customer_code) as clinic_count,
    coalesce(sum(o.amount) filter (
      where date_trunc('month', o.order_date) = (select current_month_start from month_bounds)
    ), 0)::bigint as current_month_sales
  from public.clinics c
  left join public.clinic_orders o on o.customer_code = c.customer_code
  group by c.area
),
top_clinic_rows as (
  select
    c.customer_code,
    c.name,
    coalesce(sr.name, '担当未割当') as staff_name,
    sum(w.amount)::bigint as total_sales
  from window_orders w
  join public.clinics c on c.customer_code = w.customer_code
  left join public.sales_reps sr on sr.id = c.staff_id
  group by c.customer_code, c.name, sr.name
  order by total_sales desc
  limit 5
)
select jsonb_build_object(
  'generatedAt', now(),
  'period', jsonb_build_object(
    'start', to_char((select min(month_start) from months), 'YYYY-MM-DD'),
    'end', to_char((select current_month_start from month_bounds), 'YYYY-MM-DD'),
    'label', to_char((select min(month_start) from months), 'YYYY年MM月') || '〜' ||
             to_char((select current_month_start from month_bounds), 'YYYY年MM月')
  ),
  'summary', jsonb_build_object(
    'totalSales', (select coalesce(sum(sales_amount), 0) from monthly_trend_rows),
    'monthlyAvgSales', (
      select round(coalesce(sum(sales_amount), 0) / p_months::numeric) from monthly_trend_rows
    ),
    'totalOrderCount', (select coalesce(sum(order_count), 0) from monthly_trend_rows),
    'avgOrderValue', (
      select case when sum(order_count) is null or sum(order_count) = 0 then null
        else round(sum(sales_amount) / sum(order_count)::numeric) end
      from monthly_trend_rows
    ),
    'yoySalesGrowthPct', (
      select case
        when (select coalesce(sum(amount), 0) from prev_year_orders) = 0 then null
        else round(
          ((select coalesce(sum(sales_amount), 0) from monthly_trend_rows) -
           (select sum(amount) from prev_year_orders))
          / (select sum(amount) from prev_year_orders)::numeric * 100, 1)
      end
    )
  ),
  'monthlyTrend', (
    select jsonb_agg(jsonb_build_object(
      'month', to_char(month_start, 'YYYY-MM'),
      'label', extract(month from month_start)::integer::text || '月',
      'salesAmount', sales_amount,
      'orderCount', order_count
    ) order by month_start)
    from monthly_trend_rows
  ),
  'byStaff', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'staffId', sl.staff_id,
      'staffName', sl.staff_name,
      'clinicCount', coalesce(cc.clinic_count, 0),
      'currentMonthSales', coalesce(ms.amount, 0),
      'currentMonthVisitCount', coalesce(mv.visit_count, 0),
      'salesPerClinic', case when coalesce(cc.clinic_count, 0) = 0 then null
        else round(coalesce(ms.amount, 0) / cc.clinic_count::numeric) end
    )), '[]'::jsonb)
    from staff_list sl
    left join staff_clinic_count cc on cc.staff_id is not distinct from sl.staff_id
    left join staff_month_sales ms on ms.staff_id is not distinct from sl.staff_id
    left join staff_month_visits mv on mv.staff_id is not distinct from sl.staff_id
  ),
  'byArea', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'area', area,
      'clinicCount', clinic_count,
      'currentMonthSales', current_month_sales
    ) order by current_month_sales desc), '[]'::jsonb)
    from area_rollup
  ),
  'topClinics', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'customerCode', customer_code,
      'name', name,
      'staffName', staff_name,
      'totalSales', total_sales,
      'monthlyAvgSales', round(total_sales / p_months::numeric)
    ) order by total_sales desc), '[]'::jsonb)
    from top_clinic_rows
  )
);
$$;

revoke execute on function public.get_bgj_sales_report(integer)
  from public, anon, authenticated;
grant execute on function public.get_bgj_sales_report(integer)
  to service_role;

-- ウェビナー Phase 1（BGJ管理・対象医院公開・外部参加URL）
create table if not exists public.webinars (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'canceled')),
  organizer_email text not null,
  version integer not null default 1 check (version > 0),
  published_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webinar_sessions (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  provider text not null check (provider in ('google_meet', 'zoom')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Asia/Tokyo',
  join_url text not null check (join_url ~ '^https://'),
  external_space_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webinar_sessions_time_order check (ends_at > starts_at),
  constraint webinar_sessions_one_slot unique (webinar_id, starts_at)
);

create table if not exists public.webinar_target_clinics (
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  customer_code text not null references public.clinics(customer_code) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (webinar_id, customer_code)
);

create table if not exists public.webinar_events (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'updated', 'published', 'canceled')),
  actor_email text not null,
  from_status text check (from_status is null or from_status in ('draft', 'published', 'canceled')),
  to_status text not null check (to_status in ('draft', 'published', 'canceled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_webinars_status_updated on public.webinars(status, updated_at desc);
create index if not exists idx_webinar_sessions_starts on public.webinar_sessions(starts_at);
create index if not exists idx_webinar_target_clinics_customer on public.webinar_target_clinics(customer_code, webinar_id);
create index if not exists idx_webinar_events_webinar_created on public.webinar_events(webinar_id, created_at desc);

alter table public.webinars enable row level security;
alter table public.webinar_sessions enable row level security;
alter table public.webinar_target_clinics enable row level security;
alter table public.webinar_events enable row level security;

create or replace function public.save_webinar_draft(
  p_webinar_id uuid, p_expected_version integer, p_title text, p_description text,
  p_provider text, p_starts_at timestamptz, p_ends_at timestamptz, p_timezone text,
  p_join_url text, p_customer_codes text[], p_actor_email text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_missing integer;
begin
  if nullif(trim(p_title), '') is null or char_length(trim(p_title)) > 200
     or p_provider not in ('google_meet', 'zoom') or p_ends_at <= p_starts_at
     or p_join_url !~ '^https://' or coalesce(array_length(p_customer_codes, 1), 0) = 0
     or nullif(trim(p_actor_email), '') is null then raise exception 'ウェビナー入力が不正です'; end if;
  select count(*) into v_missing from unnest(p_customer_codes) code
  left join public.clinics c on c.customer_code = code where c.customer_code is null;
  if v_missing > 0 then raise exception '存在しない対象医院が含まれています'; end if;
  if p_webinar_id is null then
    insert into public.webinars (title, description, organizer_email)
    values (trim(p_title), nullif(trim(p_description), ''), p_actor_email) returning id into v_id;
    insert into public.webinar_events (webinar_id, event_type, actor_email, from_status, to_status)
    values (v_id, 'created', p_actor_email, null, 'draft');
  else
    update public.webinars set title = trim(p_title), description = nullif(trim(p_description), ''),
      version = version + 1, updated_at = now()
    where id = p_webinar_id and status = 'draft' and version = p_expected_version returning id into v_id;
    if v_id is null then raise exception '更新競合または下書き以外は編集できません'; end if;
    delete from public.webinar_sessions where webinar_id = v_id;
    delete from public.webinar_target_clinics where webinar_id = v_id;
    insert into public.webinar_events (webinar_id, event_type, actor_email, from_status, to_status)
    values (v_id, 'updated', p_actor_email, 'draft', 'draft');
  end if;
  insert into public.webinar_sessions (webinar_id, provider, starts_at, ends_at, timezone, join_url)
  values (v_id, p_provider, p_starts_at, p_ends_at, p_timezone, p_join_url);
  insert into public.webinar_target_clinics (webinar_id, customer_code)
  select v_id, code from (select distinct unnest(p_customer_codes) as code) selected;
  return v_id;
end; $$;

create or replace function public.transition_webinar(
  p_webinar_id uuid, p_expected_version integer, p_to_status text, p_actor_email text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_from text;
begin
  select status into v_from from public.webinars where id = p_webinar_id and version = p_expected_version for update;
  if v_from is null then raise exception '更新競合'; end if;
  if not ((v_from = 'draft' and p_to_status in ('published', 'canceled')) or (v_from = 'published' and p_to_status = 'canceled'))
    then raise exception '不正な状態遷移'; end if;
  update public.webinars set status = p_to_status, version = version + 1, updated_at = now(),
    published_at = case when p_to_status = 'published' then now() else published_at end,
    canceled_at = case when p_to_status = 'canceled' then now() else canceled_at end where id = p_webinar_id;
  insert into public.webinar_events (webinar_id, event_type, actor_email, from_status, to_status)
  values (p_webinar_id, p_to_status, p_actor_email, v_from, p_to_status);
  return p_webinar_id;
end; $$;

revoke all on public.webinars, public.webinar_sessions, public.webinar_target_clinics, public.webinar_events from anon, authenticated;
revoke execute on function public.save_webinar_draft(uuid, integer, text, text, text, timestamptz, timestamptz, text, text, text[], text) from public, anon, authenticated;
revoke execute on function public.transition_webinar(uuid, integer, text, text) from public, anon, authenticated;
grant all on public.webinars, public.webinar_sessions, public.webinar_target_clinics, public.webinar_events to service_role;
grant execute on function public.save_webinar_draft(uuid, integer, text, text, text, timestamptz, timestamptz, text, text, text[], text) to service_role;
grant execute on function public.transition_webinar(uuid, integer, text, text) to service_role;

-- 医院業務連絡担当者の役職マスタ
create table if not exists public.clinic_contact_roles (
  role_key text primary key check (role_key in ('physician', 'dentist', 'nurse', 'dental_hygienist', 'receptionist', 'other')),
  label text not null unique,
  sort_order integer not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.clinic_contact_roles(role_key,label,sort_order) values
 ('physician','医師',10),('dentist','歯科医師',20),('nurse','看護師',30),
 ('dental_hygienist','歯科衛生士',40),('receptionist','受付',50),('other','その他',60)
on conflict(role_key) do update set label=excluded.label,sort_order=excluded.sort_order;
create trigger trg_clinic_contact_roles_updated_at before update on public.clinic_contact_roles for each row execute function public.set_updated_at_generic();

-- 医院業務連絡担当者（医院代表情報・認証アカウント・患者向けスタッフ紹介とは分離）
create table if not exists public.clinic_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null references public.clinics(customer_code) on delete restrict,
  clinic_user_id uuid not null,
  name text not null check (char_length(name) between 1 and 100),
  department text,
  role_key text not null default 'other' references public.clinic_contact_roles(role_key) on delete restrict,
  email text,
  phone text,
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  version integer not null default 1 check (version > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_contacts_active_primary check (not is_primary or (status = 'active' and deleted_at is null)),
  constraint clinic_contacts_email_format check (email is null or (char_length(email) <= 254 and position('@' in email) > 1)),
  constraint clinic_contacts_contact_method check (email is not null or phone is not null),
  constraint clinic_contacts_clinic_user_customer_fkey foreign key (clinic_user_id, customer_code)
    references public.clinic_users(id, customer_code) on delete restrict,
  constraint clinic_contacts_clinic_user_id_key unique (clinic_user_id)
);
create table if not exists public.clinic_contact_notification_preferences (
  contact_id uuid not null references public.clinic_contacts(id) on delete restrict,
  topic text not null check (topic in ('webinar', 'orders', 'billing', 'product', 'system', 'sales')),
  channel text not null check (channel in ('email', 'phone')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (contact_id, topic, channel)
);
create table if not exists public.clinic_contact_events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.clinic_contacts(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'updated', 'deactivated', 'reactivated', 'primary_changed', 'deleted',
    'login_created', 'login_updated', 'login_disabled', 'role_changed')),
  actor_type text not null check (actor_type in ('bgj', 'clinic', 'system')),
  actor_identifier text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.webinar_target_contacts (
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  contact_id uuid not null references public.clinic_contacts(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (webinar_id, contact_id)
);
create unique index if not exists clinic_contacts_one_primary on public.clinic_contacts(customer_code)
  where is_primary and status = 'active' and deleted_at is null;
create index if not exists idx_clinic_contacts_customer on public.clinic_contacts(customer_code, status, is_primary desc) where deleted_at is null;
create index if not exists idx_clinic_contact_events_contact on public.clinic_contact_events(contact_id, created_at desc);
create index if not exists idx_webinar_target_contacts_contact on public.webinar_target_contacts(contact_id, webinar_id);
drop trigger if exists trg_clinic_contacts_updated_at on public.clinic_contacts;
create trigger trg_clinic_contacts_updated_at before update on public.clinic_contacts for each row execute function public.set_updated_at_generic();
drop trigger if exists trg_clinic_contact_preferences_updated_at on public.clinic_contact_notification_preferences;
create trigger trg_clinic_contact_preferences_updated_at before update on public.clinic_contact_notification_preferences for each row execute function public.set_updated_at_generic();
alter table public.clinic_contacts enable row level security;
alter table public.clinic_contact_notification_preferences enable row level security;
alter table public.clinic_contact_events enable row level security;
alter table public.webinar_target_contacts enable row level security;

create or replace function public.save_clinic_contact(
  p_contact_id uuid, p_expected_version integer, p_customer_code text, p_clinic_user_id uuid,
  p_name text, p_department text, p_role_key text, p_email text, p_phone text,
  p_is_primary boolean, p_status text, p_notes text, p_email_topics text[], p_phone_topics text[],
  p_actor_type text, p_actor_identifier text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_previous_status text; v_event_type text;
begin
  if nullif(trim(p_name), '') is null or char_length(trim(p_name)) > 100
    or not exists (select 1 from public.clinic_contact_roles where role_key = p_role_key)
    or (nullif(trim(p_email), '') is null and nullif(trim(p_phone), '') is null)
    or p_status not in ('active', 'inactive') or p_actor_type not in ('bgj', 'clinic', 'system')
    or nullif(trim(p_actor_identifier), '') is null then raise exception '担当者入力が不正です'; end if;
  if exists (select 1 from unnest(coalesce(p_email_topics, '{}'::text[]) || coalesce(p_phone_topics, '{}'::text[])) topic
    where topic not in ('webinar', 'orders', 'billing', 'product', 'system', 'sales')) then raise exception '通知種別が不正です'; end if;
  if nullif(trim(p_email), '') is null and coalesce(array_length(p_email_topics, 1), 0) > 0 then raise exception 'メール通知にはメールアドレスが必要です'; end if;
  if nullif(trim(p_phone), '') is null and coalesce(array_length(p_phone_topics, 1), 0) > 0 then raise exception '電話連絡には電話番号が必要です'; end if;
  if p_clinic_user_id is not null and not exists (select 1 from public.clinic_users where id = p_clinic_user_id and customer_code = p_customer_code)
    then raise exception '医院ログインが一致しません'; end if;
  if p_is_primary and p_status = 'active' then
    insert into public.clinic_contact_events(contact_id, event_type, actor_type, actor_identifier)
      select id, 'primary_changed', p_actor_type, p_actor_identifier from public.clinic_contacts
      where customer_code = p_customer_code and id is distinct from p_contact_id and is_primary and status = 'active' and deleted_at is null;
    update public.clinic_contacts set is_primary = false, version = version + 1
      where customer_code = p_customer_code and id is distinct from p_contact_id and is_primary and status = 'active' and deleted_at is null;
  end if;
  if p_contact_id is null then
    insert into public.clinic_contacts(customer_code, clinic_user_id, name, department, role_key, email, phone, is_primary, status, notes)
    values (p_customer_code, p_clinic_user_id, trim(p_name), nullif(trim(p_department), ''), p_role_key,
      lower(nullif(trim(p_email), '')), nullif(trim(p_phone), ''), p_is_primary and p_status = 'active', p_status, nullif(trim(p_notes), ''))
    returning id into v_id; v_event_type := 'created';
  else
    select status into v_previous_status from public.clinic_contacts where id = p_contact_id and customer_code = p_customer_code and deleted_at is null;
    update public.clinic_contacts set clinic_user_id = p_clinic_user_id, name = trim(p_name), department = nullif(trim(p_department), ''),
      role_key = p_role_key, email = lower(nullif(trim(p_email), '')), phone = nullif(trim(p_phone), ''),
      is_primary = p_is_primary and p_status = 'active', status = p_status, notes = nullif(trim(p_notes), ''), version = version + 1
    where id = p_contact_id and customer_code = p_customer_code and deleted_at is null and version = p_expected_version returning id into v_id;
    if v_id is null then raise exception '更新競合'; end if;
    v_event_type := case when v_previous_status = 'active' and p_status = 'inactive' then 'deactivated'
      when v_previous_status = 'inactive' and p_status = 'active' then 'reactivated' else 'updated' end;
    delete from public.clinic_contact_notification_preferences where contact_id = v_id;
  end if;
  update public.clinic_users set name = trim(p_name) where id = p_clinic_user_id;
  insert into public.clinic_contact_notification_preferences(contact_id, topic, channel)
    select v_id, topic, 'email' from (select distinct unnest(coalesce(p_email_topics, '{}'::text[])) topic) topics;
  insert into public.clinic_contact_notification_preferences(contact_id, topic, channel)
    select v_id, topic, 'phone' from (select distinct unnest(coalesce(p_phone_topics, '{}'::text[])) topic) topics;
  insert into public.clinic_contact_events(contact_id, event_type, actor_type, actor_identifier)
    values (v_id, v_event_type, p_actor_type, p_actor_identifier);
  return v_id;
end; $$;
create or replace function public.delete_clinic_contact(p_contact_id uuid, p_expected_version integer, p_customer_code text, p_actor_type text, p_actor_identifier text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; begin
  update public.clinic_contacts set deleted_at = now(), status = 'inactive', is_primary = false, version = version + 1
    where id = p_contact_id and customer_code = p_customer_code and deleted_at is null and version = p_expected_version returning id into v_id;
  if v_id is null then raise exception '更新競合'; end if;
  update public.clinic_contact_notification_preferences set enabled = false where contact_id = v_id;
  insert into public.clinic_contact_events(contact_id, event_type, actor_type, actor_identifier) values (v_id, 'deleted', p_actor_type, p_actor_identifier);
  return v_id;
end; $$;
create or replace function public.get_webinar_notification_recipients(p_customer_codes text[])
returns table(email text) language sql stable security definer set search_path = public as $$
  with configured as (
    select distinct c.customer_code, lower(c.email) email from public.clinic_contacts c
    join public.clinic_contact_notification_preferences p on p.contact_id = c.id
    where c.customer_code = any(p_customer_codes) and c.status = 'active' and c.deleted_at is null and c.email is not null
      and p.topic = 'webinar' and p.channel = 'email' and p.enabled
  ), fallback as (
    select u.customer_code, lower(u.email) email from public.clinic_users u
    where u.customer_code = any(p_customer_codes) and u.status = '有効' and u.email is not null
      and not exists (select 1 from configured c where c.customer_code = u.customer_code)
  ) select distinct recipients.email from (select * from configured union all select * from fallback) recipients;
$$;
alter table public.clinic_contact_roles enable row level security;
revoke all on public.clinic_contact_roles, public.clinic_contacts, public.clinic_contact_notification_preferences, public.clinic_contact_events from anon, authenticated;
revoke execute on function public.save_clinic_contact(uuid, integer, text, uuid, text, text, text, text, text, boolean, text, text, text[], text[], text, text) from public, anon, authenticated;
revoke execute on function public.delete_clinic_contact(uuid, integer, text, text, text) from public, anon, authenticated;
revoke execute on function public.get_webinar_notification_recipients(text[]) from public, anon, authenticated;
grant all on public.clinic_contact_roles, public.clinic_contacts, public.clinic_contact_notification_preferences, public.clinic_contact_events to service_role;
grant execute on function public.save_clinic_contact(uuid, integer, text, uuid, text, text, text, text, text, boolean, text, text, text[], text[], text, text) to service_role;
grant execute on function public.delete_clinic_contact(uuid, integer, text, text, text) to service_role;
grant execute on function public.get_webinar_notification_recipients(text[]) to service_role;

-- ウェビナーの対象担当者を個別指定し、Google Calendar外部予定IDを保存する版。
drop function if exists public.save_webinar_draft(uuid, integer, text, text, text, timestamptz, timestamptz, text, text, text[], text);
create or replace function public.save_webinar_draft(
  p_webinar_id uuid, p_expected_version integer, p_title text, p_description text,
  p_provider text, p_starts_at timestamptz, p_ends_at timestamptz, p_timezone text,
  p_join_url text, p_external_space_id text, p_customer_codes text[], p_contact_ids uuid[], p_actor_email text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_missing integer; v_customer_count integer; v_recipient_customer_count integer;
begin
  if nullif(trim(p_title), '') is null or char_length(trim(p_title)) > 200
    or p_provider not in ('google_meet', 'zoom') or p_ends_at <= p_starts_at or p_join_url !~ '^https://'
    or coalesce(array_length(p_customer_codes, 1), 0) = 0 or coalesce(array_length(p_contact_ids, 1), 0) = 0
    or nullif(trim(p_actor_email), '') is null then raise exception 'ウェビナー入力が不正です'; end if;
  select count(*) into v_missing from (select distinct unnest(p_customer_codes) code) selected
    left join public.clinics c on c.customer_code = selected.code where c.customer_code is null;
  if v_missing > 0 then raise exception '存在しない対象医院が含まれています'; end if;
  select count(*) into v_missing from (select distinct unnest(p_contact_ids) id) selected
    left join public.clinic_contacts c on c.id = selected.id
    where c.id is null or c.status <> 'active' or c.deleted_at is not null or c.email is null
      or not (c.customer_code = any(p_customer_codes));
  if v_missing > 0 then raise exception '選択できない担当者が含まれています'; end if;
  select count(distinct code) into v_customer_count from unnest(p_customer_codes) as selected(code);
  select count(distinct c.customer_code) into v_recipient_customer_count from public.clinic_contacts c where c.id = any(p_contact_ids);
  if v_customer_count <> v_recipient_customer_count then raise exception '対象医院ごとにメール送付先を1名以上選択してください'; end if;
  if p_webinar_id is null then
    insert into public.webinars(title, description, organizer_email)
      values(trim(p_title), nullif(trim(p_description), ''), p_actor_email) returning id into v_id;
    insert into public.webinar_events(webinar_id, event_type, actor_email, from_status, to_status)
      values(v_id, 'created', p_actor_email, null, 'draft');
  else
    update public.webinars set title=trim(p_title), description=nullif(trim(p_description), ''), version=version+1, updated_at=now()
      where id=p_webinar_id and status='draft' and version=p_expected_version returning id into v_id;
    if v_id is null then raise exception '更新競合または下書き以外は編集できません'; end if;
    delete from public.webinar_sessions where webinar_id=v_id;
    delete from public.webinar_target_contacts where webinar_id=v_id;
    delete from public.webinar_target_clinics where webinar_id=v_id;
    insert into public.webinar_events(webinar_id,event_type,actor_email,from_status,to_status)
      values(v_id,'updated',p_actor_email,'draft','draft');
  end if;
  insert into public.webinar_sessions(webinar_id,provider,starts_at,ends_at,timezone,join_url,external_space_id)
    values(v_id,p_provider,p_starts_at,p_ends_at,p_timezone,p_join_url,nullif(trim(p_external_space_id),''));
  insert into public.webinar_target_clinics(webinar_id,customer_code)
    select v_id,code from (select distinct unnest(p_customer_codes) code) selected;
  insert into public.webinar_target_contacts(webinar_id,contact_id)
    select v_id,id from (select distinct unnest(p_contact_ids) id) selected;
  return v_id;
end; $$;
create or replace function public.get_webinar_selected_recipients(p_webinar_id uuid)
returns table(contact_id uuid, contact_name text, email text)
language sql stable security definer set search_path=public as $$
  select c.id,c.name,lower(c.email) from public.webinar_target_contacts target
  join public.clinic_contacts c on c.id=target.contact_id
  where target.webinar_id=p_webinar_id and c.status='active' and c.deleted_at is null and c.email is not null
  order by c.customer_code,c.name,c.id;
$$;
create or replace function public.transition_webinar(p_webinar_id uuid,p_expected_version integer,p_to_status text,p_actor_email text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_from text;
begin
  select status into v_from from public.webinars where id=p_webinar_id and version=p_expected_version for update;
  if v_from is null then raise exception '更新競合'; end if;
  if not ((v_from='draft' and p_to_status in ('published','canceled')) or (v_from='published' and p_to_status='canceled'))
    then raise exception '不正な状態遷移'; end if;
  if p_to_status='published' and (
    exists(select 1 from public.webinar_target_contacts target left join public.clinic_contacts c on c.id=target.contact_id
      where target.webinar_id=p_webinar_id and (c.id is null or c.status<>'active' or c.deleted_at is not null or c.email is null))
    or exists(select 1 from public.webinar_target_clinics clinic_target where clinic_target.webinar_id=p_webinar_id and not exists(
      select 1 from public.webinar_target_contacts contact_target join public.clinic_contacts c on c.id=contact_target.contact_id
      where contact_target.webinar_id=clinic_target.webinar_id and c.customer_code=clinic_target.customer_code
        and c.status='active' and c.deleted_at is null and c.email is not null)))
    then raise exception '送付先担当者が無効です。下書きを編集して選択し直してください'; end if;
  update public.webinars set status=p_to_status,version=version+1,updated_at=now(),
    published_at=case when p_to_status='published' then now() else published_at end,
    canceled_at=case when p_to_status='canceled' then now() else canceled_at end where id=p_webinar_id;
  insert into public.webinar_events(webinar_id,event_type,actor_email,from_status,to_status)
    values(p_webinar_id,p_to_status,p_actor_email,v_from,p_to_status);
  return p_webinar_id;
end; $$;
revoke all on public.webinar_target_contacts from anon, authenticated;
revoke execute on function public.save_webinar_draft(uuid, integer, text, text, text, timestamptz, timestamptz, text, text, text, text[], uuid[], text) from public, anon, authenticated;
revoke execute on function public.get_webinar_selected_recipients(uuid) from public, anon, authenticated;
revoke execute on function public.transition_webinar(uuid, integer, text, text) from public, anon, authenticated;
grant all on public.webinar_target_contacts to service_role;
grant execute on function public.save_webinar_draft(uuid, integer, text, text, text, timestamptz, timestamptz, text, text, text, text[], uuid[], text) to service_role;
grant execute on function public.get_webinar_selected_recipients(uuid) to service_role;
grant execute on function public.transition_webinar(uuid, integer, text, text) to service_role;

-- 医院スタッフ管理 Phase 1（権限・ログイン連動・セッション失効）
alter table public.clinic_users add column if not exists session_version integer not null default 1 check (session_version > 0);
alter table public.clinic_users add column if not exists last_login_at timestamptz;
alter table public.clinic_users add column if not exists password_changed_at timestamptz;
create table if not exists public.clinic_portal_roles (
  role_key text primary key check (role_key in ('admin', 'staff', 'viewer')),
  label text not null unique,
  description text not null,
  sort_order integer not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.clinic_portal_role_permissions (
  role_key text not null references public.clinic_portal_roles(role_key) on delete restrict,
  permission_key text not null check (permission_key in ('view_contacts', 'manage_contacts', 'manage_logins')),
  created_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);
create table if not exists public.clinic_user_role_assignments (
  clinic_user_id uuid primary key references public.clinic_users(id) on delete cascade,
  role_key text not null references public.clinic_portal_roles(role_key) on delete restrict,
  assigned_by text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.clinic_portal_roles(role_key,label,description,sort_order) values
 ('admin','管理者','担当者・ログイン・権限を管理できます。',10),('staff','一般','医院の日常業務を行います。担当者管理は閲覧のみです。',20),('viewer','閲覧専用','担当者情報を含む医院ポータルを閲覧します。',30)
on conflict (role_key) do update set label=excluded.label,description=excluded.description,sort_order=excluded.sort_order;
insert into public.clinic_portal_role_permissions(role_key,permission_key) values
 ('admin','view_contacts'),('admin','manage_contacts'),('admin','manage_logins'),('staff','view_contacts'),('viewer','view_contacts') on conflict do nothing;
insert into public.clinic_user_role_assignments(clinic_user_id,role_key,assigned_by) select id,'admin','phase1-backfill' from public.clinic_users on conflict (clinic_user_id) do nothing;
drop trigger if exists trg_clinic_portal_roles_updated_at on public.clinic_portal_roles;
create trigger trg_clinic_portal_roles_updated_at before update on public.clinic_portal_roles for each row execute function public.set_updated_at_generic();
drop trigger if exists trg_clinic_user_role_assignments_updated_at on public.clinic_user_role_assignments;
create trigger trg_clinic_user_role_assignments_updated_at before update on public.clinic_user_role_assignments for each row execute function public.set_updated_at_generic();
alter table public.clinic_contact_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.clinic_contact_events drop constraint if exists clinic_contact_events_event_type_check;
alter table public.clinic_contact_events add constraint clinic_contact_events_event_type_check check (event_type in ('created','updated','deactivated','reactivated','primary_changed','deleted','login_created','login_updated','login_disabled','role_changed'));

create or replace function public.sync_clinic_contact_login_status() returns trigger language plpgsql security definer set search_path=public as $$
declare v_role text; v_active_admins integer;
begin
 if new.clinic_user_id is not null and (new.deleted_at is not null or new.status='inactive') and (old.deleted_at is null and old.status='active') then
  select role_key into v_role from public.clinic_user_role_assignments where clinic_user_id=new.clinic_user_id;
  if v_role='admin' then select count(*) into v_active_admins from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id=u.id where u.customer_code=new.customer_code and u.status='有効' and r.role_key='admin'; if v_active_admins<=1 then raise exception '最後の管理者は無効化できません'; end if; end if;
  update public.clinic_users set status='無効',session_version=session_version+1 where id=new.clinic_user_id and status<>'無効';
 elsif new.clinic_user_id is not null and new.deleted_at is null and new.status='active' and (old.deleted_at is not null or old.status='inactive') then
  update public.clinic_users set status='有効',session_version=session_version+1 where id=new.clinic_user_id and status<>'有効';
 end if; return new;
end; $$;
drop trigger if exists trg_clinic_contact_login_status on public.clinic_contacts;
create trigger trg_clinic_contact_login_status before update on public.clinic_contacts for each row execute function public.sync_clinic_contact_login_status();

create sequence if not exists public.clinic_user_login_id_seq minvalue 1 maxvalue 999999;
select setval('public.clinic_user_login_id_seq', least(coalesce((select max(substring(login_id from 2)::bigint) from public.clinic_users where login_id~'^A[0-9]{6}$'),0)+1,999999), coalesce((select max(substring(login_id from 2)::bigint) from public.clinic_users where login_id~'^A[0-9]{6}$'),0)>=999999);
create or replace function public.next_clinic_user_login_id() returns text language plpgsql volatile security definer set search_path=public as $$
declare v_number bigint; begin v_number:=nextval('public.clinic_user_login_id_seq'); if v_number>999999 then raise exception '医院ログインIDの採番上限に達しました'; end if; return 'A'||lpad(v_number::text,6,'0'); end; $$;

create or replace function public.save_clinic_contact_login(p_contact_id uuid,p_customer_code text,p_password_hash text,p_email text,p_status text,p_role_key text,p_actor_type text,p_actor_identifier text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_user_id uuid; v_contact_name text; v_current_role text; v_current_status text; v_active_admins integer; v_role_key text:=p_role_key; v_event_type text;
begin
 if p_status not in ('有効','無効') or p_role_key not in ('admin','staff','viewer') or p_actor_type not in ('bgj','clinic','system') then raise exception 'ログイン入力が不正です'; end if;
 select name,clinic_user_id into v_contact_name,v_user_id from public.clinic_contacts where id=p_contact_id and customer_code=p_customer_code and deleted_at is null for update;
 if v_contact_name is null then raise exception '担当者が見つかりません'; end if;
 if v_user_id is null then
  if nullif(p_password_hash,'') is null then raise exception '初期パスワードが必要です'; end if;
  if p_status='有効' and not exists(select 1 from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id=u.id where u.customer_code=p_customer_code and u.status='有効' and r.role_key='admin') then v_role_key:='admin'; end if;
  insert into public.clinic_users(customer_code,login_id,password_hash,name,email,status,password_changed_at,must_change_password) values(p_customer_code,public.next_clinic_user_login_id(),p_password_hash,v_contact_name,lower(nullif(trim(p_email),'')),p_status,null,true) returning id into v_user_id;
  update public.clinic_contacts set clinic_user_id=v_user_id,version=version+1 where id=p_contact_id;
  insert into public.clinic_user_role_assignments(clinic_user_id,role_key,assigned_by) values(v_user_id,v_role_key,p_actor_identifier); v_event_type:='login_created';
 else
  select u.status,r.role_key into v_current_status,v_current_role from public.clinic_users u left join public.clinic_user_role_assignments r on r.clinic_user_id=u.id where u.id=v_user_id and u.customer_code=p_customer_code for update of u;
  if p_status='有効' and v_role_key<>'admin' and not exists(select 1 from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id=u.id where u.customer_code=p_customer_code and u.status='有効' and r.role_key='admin' and u.id<>v_user_id) then v_role_key:='admin'; end if;
  if v_current_role='admin' and (v_role_key<>'admin' or p_status='無効') then select count(*) into v_active_admins from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id=u.id where u.customer_code=p_customer_code and u.status='有効' and r.role_key='admin'; if v_active_admins<=1 then raise exception '最後の管理者は変更・無効化できません'; end if; end if;
  update public.clinic_users set name=v_contact_name,email=lower(nullif(trim(p_email),'')),status=p_status,password_hash=coalesce(nullif(p_password_hash,''),password_hash),password_changed_at=case when nullif(p_password_hash,'') is not null then now() else password_changed_at end,session_version=session_version+case when p_status is distinct from v_current_status or nullif(p_password_hash,'') is not null then 1 else 0 end where id=v_user_id;
  insert into public.clinic_user_role_assignments(clinic_user_id,role_key,assigned_by) values(v_user_id,v_role_key,p_actor_identifier) on conflict(clinic_user_id) do update set role_key=excluded.role_key,assigned_by=excluded.assigned_by;
  v_event_type:=case when p_status='無効' and v_current_status='有効' then 'login_disabled' when v_current_role is distinct from v_role_key then 'role_changed' else 'login_updated' end;
 end if;
 insert into public.clinic_contact_events(contact_id,event_type,actor_type,actor_identifier,metadata) values(p_contact_id,v_event_type,p_actor_type,p_actor_identifier,jsonb_build_object('clinic_user_id',v_user_id,'role_key',v_role_key,'status',p_status)); return v_user_id;
end; $$;
create or replace function public.set_clinic_user_password(p_clinic_user_id uuid,p_password_hash text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; begin if nullif(p_password_hash,'') is null then raise exception 'パスワードが必要です'; end if; update public.clinic_users set password_hash=p_password_hash,password_changed_at=now(),must_change_password=false,session_version=session_version+1,failed_login_attempts=0,locked_until=null where id=p_clinic_user_id returning id into v_id; if v_id is null then raise exception '医院ログインが見つかりません'; end if; return v_id; end; $$;
create or replace function public.complete_initial_clinic_password_change(p_clinic_user_id uuid,p_password_hash text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; begin if nullif(p_password_hash,'') is null then raise exception 'パスワードが必要です'; end if; update public.clinic_users set password_hash=p_password_hash,password_changed_at=now(),must_change_password=false,session_version=session_version+1,failed_login_attempts=0,locked_until=null where id=p_clinic_user_id and must_change_password returning id into v_id; if v_id is null then raise exception '初回パスワード変更の対象が見つかりません'; end if; return v_id; end; $$;
drop function if exists public.get_clinic_session_state(uuid);
create function public.get_clinic_session_state(p_clinic_user_id uuid) returns table(status text,session_version integer,role_key text,permissions text[],must_change_password boolean) language sql stable security definer set search_path=public as $$
 select u.status,u.session_version,coalesce(r.role_key,'admin'),array(select p.permission_key from public.clinic_portal_role_permissions p where p.role_key=coalesce(r.role_key,'admin') order by p.permission_key),u.must_change_password from public.clinic_users u left join public.clinic_user_role_assignments r on r.clinic_user_id=u.id where u.id=p_clinic_user_id;
$$;
alter table public.clinic_portal_roles enable row level security; alter table public.clinic_portal_role_permissions enable row level security; alter table public.clinic_user_role_assignments enable row level security;
revoke all on public.clinic_portal_roles,public.clinic_portal_role_permissions,public.clinic_user_role_assignments from anon,authenticated;
revoke execute on function public.save_clinic_contact_login(uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
revoke all on sequence public.clinic_user_login_id_seq from public,anon,authenticated;
revoke execute on function public.next_clinic_user_login_id() from public,anon,authenticated;
revoke execute on function public.complete_initial_clinic_password_change(uuid,text) from public,anon,authenticated;
revoke execute on function public.set_clinic_user_password(uuid,text) from public,anon,authenticated;
revoke execute on function public.get_clinic_session_state(uuid) from public,anon,authenticated;
grant all on public.clinic_portal_roles,public.clinic_portal_role_permissions,public.clinic_user_role_assignments to service_role;
grant execute on function public.save_clinic_contact_login(uuid,text,text,text,text,text,text,text) to service_role;
grant usage,select on sequence public.clinic_user_login_id_seq to service_role;
grant execute on function public.next_clinic_user_login_id() to service_role;
grant execute on function public.complete_initial_clinic_password_change(uuid,text) to service_role;
grant execute on function public.set_clinic_user_password(uuid,text) to service_role;
grant execute on function public.get_clinic_session_state(uuid) to service_role;

create or replace function public.create_clinic_contact_with_login(
  p_customer_code text,p_password_hash text,p_portal_role_key text,p_name text,p_department text,p_role_key text,p_email text,p_phone text,
  p_is_primary boolean,p_status text,p_notes text,p_email_topics text[],p_phone_topics text[],p_actor_type text,p_actor_identifier text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_user_id uuid; v_contact_id uuid; v_portal_role_key text:=p_portal_role_key;
begin
 if nullif(p_password_hash,'') is null or p_portal_role_key not in ('admin','staff','viewer') or p_status not in ('active','inactive') then raise exception '担当者認証入力が不正です'; end if;
 if p_status='active' and not exists(select 1 from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id=u.id where u.customer_code=p_customer_code and u.status='有効' and r.role_key='admin') then v_portal_role_key:='admin'; end if;
 insert into public.clinic_users(customer_code,login_id,password_hash,name,email,status,must_change_password)
 values(p_customer_code,public.next_clinic_user_login_id(),p_password_hash,trim(p_name),lower(nullif(trim(p_email),'')),case when p_status='active' then '有効' else '無効' end,true) returning id into v_user_id;
 insert into public.clinic_user_role_assignments(clinic_user_id,role_key,assigned_by) values(v_user_id,v_portal_role_key,p_actor_identifier);
 v_contact_id:=public.save_clinic_contact(null,1,p_customer_code,v_user_id,p_name,p_department,p_role_key,p_email,p_phone,p_is_primary,p_status,p_notes,p_email_topics,p_phone_topics,p_actor_type,p_actor_identifier);
 return v_contact_id;
end; $$;
revoke execute on function public.create_clinic_contact_with_login(text,text,text,text,text,text,text,text,boolean,text,text,text[],text[],text,text) from public,anon,authenticated;
grant execute on function public.create_clinic_contact_with_login(text,text,text,text,text,text,text,text,boolean,text,text,text[],text[],text,text) to service_role;
