-- Shopify連携前から使える患者注文・受け取り進捗。
-- 本体定義はsupabase/schema.sql 9.10節。既存環境へはこの差分を適用する。
create table if not exists public.patient_orders (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null references public.clinics (customer_code),
  patient_id uuid not null references public.patients (id) on delete cascade,
  order_type text not null default 'one_time' check (order_type in ('one_time','subscription')),
  fulfillment_method text not null default 'pickup' check (fulfillment_method in ('pickup','delivery')),
  status text not null default 'received' check (status in ('received','preparing','ready','shipped','completed','canceled')),
  ordered_at timestamptz not null default now(),
  next_fulfillment_date date,
  source text not null default 'internal' check (source in ('internal','shopify')),
  external_order_id text,
  sync_status text not null default 'local' check (sync_status in ('local','pending','synced','error')),
  sync_error text,
  external_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_order_id)
);

create index if not exists idx_patient_orders_patient on public.patient_orders (patient_id, ordered_at desc);
create index if not exists idx_patient_orders_clinic on public.patient_orders (customer_code, ordered_at desc);

drop trigger if exists trg_patient_orders_updated_at on public.patient_orders;
create trigger trg_patient_orders_updated_at
  before update on public.patient_orders
  for each row execute function public.set_updated_at_generic();

create table if not exists public.patient_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.patient_orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  unit_snapshot text,
  image_type_snapshot text not null default 'supplement'
    check (image_type_snapshot in ('supplement','yogurt','toothbrush','oral')),
  daily_amount_snapshot text,
  volume_snapshot text,
  caution_snapshot text,
  external_line_item_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_patient_order_items_order_id on public.patient_order_items (order_id);
alter table public.patient_orders enable row level security;
alter table public.patient_order_items enable row level security;
