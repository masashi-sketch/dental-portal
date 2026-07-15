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
--    BGJポータルで登録・編集し、医院用ポータル（医院設定）・患者マスタ・
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
  -- 注意：既存モックUIの表示/非表示トグルを踏襲した平文保存。本番導入時は必ずハッシュ化すること。
  password      text not null,
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
--    「医院設定」で参照表示する。得意先マスタへの実FK。
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
-- 9. RLS：ポリシーを一切定義せず有効化するのみ。
--    anon/authenticated からは読み書き一切不可。service_role キーのみアクセス可能。
-- ============================================================
alter table public.periodontal_stages     enable row level security;
alter table public.periodontal_grades     enable row level security;
alter table public.staff_roles            enable row level security;
alter table public.staff_areas            enable row level security;
alter table public.sales_reps             enable row level security;
alter table public.clinics                enable row level security;
alter table public.clinic_orders          enable row level security;
alter table public.clinic_visits          enable row level security;
alter table public.patients               enable row level security;
alter table public.periodontal_diagnoses  enable row level security;
alter table public.clinic_terms           enable row level security;
