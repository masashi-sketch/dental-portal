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
  id                 smallint primary key default 1 check (id = 1),
  slack_webhook_url  text,
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
  -- パスワードをお忘れの方の自己リセット用（BGJがログイン発行・編集画面から入力する。
  -- 未登録でも従来通りBGJによる手動リセットは可能）
  email         text,
  status        text not null default '有効' check (status in ('有効','無効')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- ログインの総当たり対策（src/lib/auth/loginLockout.ts）
  failed_login_attempts int not null default 0,
  locked_until           timestamptz
);

create index idx_clinic_users_customer_code on public.clinic_users (customer_code);
create unique index clinic_users_email_key on public.clinic_users (email) where email is not null;

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
