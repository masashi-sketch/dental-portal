-- 目的: BGJ受注一覧から、既存患者向けの医院受け取り注文を複数明細で代理登録する。
-- 影響: patient_ordersへ登録経路を追加し、監査用patient_order_eventsと登録RPCを新設する。
-- 既存データ: source='shopify'はshopify、それ以外はclinic_portalとして補完する。注文内容は変更しない。
-- 戻し方・実行後確認SQLは末尾に記載する。
alter table public.patient_orders
  add column if not exists created_via text;

update public.patient_orders
   set created_via = case when source = 'shopify' then 'shopify' else 'clinic_portal' end
 where created_via is null;

alter table public.patient_orders
  alter column created_via set default 'clinic_portal',
  alter column created_via set not null;

alter table public.patient_orders
  drop constraint if exists patient_orders_created_via_check;
alter table public.patient_orders
  add constraint patient_orders_created_via_check
  check (created_via in ('clinic_portal','bgj_portal','shopify'));

create table if not exists public.patient_order_events (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.patient_orders (id) on delete cascade,
  event_type            text not null check (event_type in ('created','status_changed')),
  actor_type             text not null check (actor_type in ('bgj','clinic','system','external')),
  actor_identifier       text not null,
  from_status            text check (from_status is null or from_status in ('received','preparing','ready','shipped','completed','canceled')),
  to_status              text check (to_status is null or to_status in ('received','preparing','ready','shipped','completed','canceled')),
  created_at             timestamptz not null default now()
);

create index if not exists idx_patient_order_events_order_id
  on public.patient_order_events (order_id, created_at);

alter table public.patient_order_events enable row level security;

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
    unit_snapshot, image_type_snapshot, daily_amount_snapshot,
    volume_snapshot, caution_snapshot
  )
  select v_order_id, product.id, product.name, product.price, requested.quantity,
         product.unit, product.image_type, product.daily_amount,
         product.volume, product.caution
    from jsonb_to_recordset(p_items) as requested("productId" uuid, quantity integer)
    join public.products product on product.id = requested."productId";

  insert into public.patient_order_events (
    order_id, event_type, actor_type, actor_identifier, to_status
  ) values (
    v_order_id, 'created', 'bgj', btrim(p_actor_identifier), 'received'
  );

  return v_order_id;
end;
$$;

revoke execute on function public.create_bgj_patient_order(text, uuid, jsonb, uuid, text)
  from public, anon, authenticated;
grant execute on function public.create_bgj_patient_order(text, uuid, jsonb, uuid, text)
  to service_role;

-- rollback:
-- drop function if exists public.create_bgj_patient_order(text, uuid, jsonb, uuid, text);
-- drop table if exists public.patient_order_events;
-- alter table public.patient_orders drop constraint if exists patient_orders_created_via_check;
-- alter table public.patient_orders drop column if exists created_via;

-- 確認:
-- select column_name, is_nullable, column_default from information_schema.columns
--  where table_schema = 'public' and table_name = 'patient_orders' and column_name = 'created_via';
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'public' and tablename = 'patient_order_events';
-- select proname from pg_proc where proname = 'create_bgj_patient_order';
