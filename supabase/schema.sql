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

create table public.staff_areas (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
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

-- ============================================================
-- 3b. 営業担当者マスタ。BGJポータルの「マスタ > 営業担当」で登録・編集する。
--     顔写真は画像URLを保持するのみ（アップロード機能は持たない）。
--     役職・担当エリアはそれぞれのマスタへの実FK（削除時はNULLに戻す＝
--     マスタ側を削除しても担当者データ自体は消さない）。
-- ============================================================
create table public.sales_reps (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role_id    uuid references public.staff_roles (id) on delete set null,
  area_id    uuid references public.staff_areas (id) on delete set null,
  phone      text,
  email      text,
  photo_url  text,                              -- 顔写真の画像URL
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  status          text not null default '活性' check (status in ('活性','休眠','解約リスク')),
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
  updated_at                   timestamptz not null default now()
);

create trigger trg_clinic_patient_settings_updated_at
  before update on public.clinic_patient_settings
  for each row execute function public.set_updated_at_generic();

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
-- 6. 患者マスタ（得意先コード＝医院を識別するコードを保持。得意先マスタへの実FK）
-- ============================================================
create table public.patients (
  id            uuid primary key default gen_random_uuid(),
  customer_code text not null references public.clinics (customer_code),
  seq_no        int generated always as identity,
  patient_no    text generated always as ('T-' || lpad(seq_no::text, 5, '0')) stored,
  name          text not null,
  login_id      text not null,
  password_hash text not null,
  status        text not null default '有効' check (status in ('有効','無効')),
  registered_at date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (login_id)
);

create index idx_patients_customer_code on public.patients (customer_code);

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
  wholesale_rate      numeric(5,2) not null default 0,  -- 仕切値率（%）
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
  status        text not null default '有効' check (status in ('有効','無効')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_clinic_users_customer_code on public.clinic_users (customer_code);

create trigger trg_clinic_users_updated_at
  before update on public.clinic_users
  for each row execute function public.set_updated_at_generic();

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
alter table public.sales_reps             enable row level security;
alter table public.clinics                enable row level security;
alter table public.clinic_patient_settings enable row level security;
alter table public.clinic_intro_info      enable row level security;
alter table public.clinic_orders          enable row level security;
alter table public.clinic_visits          enable row level security;
alter table public.patients               enable row level security;
alter table public.periodontal_diagnoses  enable row level security;
alter table public.clinic_terms           enable row level security;
alter table public.clinic_users           enable row level security;
alter table public.clinic_staff           enable row level security;
alter table public.clinic_qa              enable row level security;

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
