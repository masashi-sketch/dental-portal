-- 目的: 医院・BGJの実注文で自宅配送を選択し、注文時点の配送先を保存できるようにする。
-- 影響: order_shipping_addressesと共通注文登録RPCを追加する。既存注文は変更しない。
-- 既存データ: fulfillment_method='delivery'でも過去注文の配送先は推測・補完しない。
-- 戻し方・実行後確認SQLは末尾に記載する。
create table if not exists public.order_shipping_addresses (
  order_id              uuid primary key references public.patient_orders (id) on delete cascade,
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
  created_at            timestamptz not null default now()
);

alter table public.order_shipping_addresses enable row level security;

create or replace function public.create_portal_patient_order(
  p_customer_code text,
  p_patient_id uuid,
  p_items jsonb,
  p_fulfillment_method text,
  p_shipping_postal_code text,
  p_shipping_prefecture text,
  p_shipping_city text,
  p_shipping_address_line1 text,
  p_shipping_address_line2 text,
  p_shipping_recipient_name text,
  p_shipping_phone text,
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
  if p_fulfillment_method = 'delivery' and (
    coalesce(p_shipping_postal_code, '') !~ '^[0-9]{3}-[0-9]{4}$' or
    length(coalesce(btrim(p_shipping_prefecture), '')) not between 2 and 4 or
    length(coalesce(btrim(p_shipping_city), '')) not between 1 and 100 or
    length(coalesce(btrim(p_shipping_address_line1), '')) not between 1 and 200 or
    length(coalesce(btrim(p_shipping_address_line2), '')) > 200 or
    length(coalesce(btrim(p_shipping_recipient_name), '')) not between 1 and 100 or
    coalesce(p_shipping_phone, '') !~ '^[0-9+() -]{8,30}$' or
    length(regexp_replace(coalesce(p_shipping_phone, ''), '[^0-9]', '', 'g')) not between 10 and 15
  ) then
    raise exception '配送先が不正です。';
  end if;

  select id into v_order_id from public.patient_orders
   where customer_code = p_customer_code and idempotency_key = p_idempotency_key;
  if v_order_id is not null then return v_order_id; end if;

  if not exists (
    select 1 from public.patients
     where id = p_patient_id and customer_code = p_customer_code and status = '有効'
  ) then raise exception '患者が見つかりません。'; end if;

  with requested_items as (
    select (item->>'productId')::uuid as product_id, (item->>'quantity')::integer as quantity
      from jsonb_array_elements(p_items) as item
  )
  select count(*), count(distinct product_id) into v_item_count, v_distinct_product_count
    from requested_items where quantity between 1 and 100;
  if v_item_count <> jsonb_array_length(p_items) or v_distinct_product_count <> v_item_count then
    raise exception '商品または数量が不正です。';
  end if;

  with requested_items as (
    select (item->>'productId')::uuid as product_id from jsonb_array_elements(p_items) as item
  )
  select count(*) into v_available_product_count
    from requested_items requested
    join public.products product on product.id = requested.product_id and product.status = '公開'
   where not exists (
     select 1 from public.clinic_product_settings setting
      where setting.customer_code = p_customer_code and setting.product_id = requested.product_id and setting.is_visible = false
   );
  if v_available_product_count <> v_item_count then raise exception '選択できない商品が含まれています。'; end if;

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
    unit_snapshot, image_type_snapshot, daily_amount_snapshot, volume_snapshot, caution_snapshot
  )
  select v_order_id, product.id, product.name, product.price, requested.quantity,
         product.unit, product.image_type, product.daily_amount, product.volume, product.caution
    from jsonb_to_recordset(p_items) as requested("productId" uuid, quantity integer)
    join public.products product on product.id = requested."productId";

  if p_fulfillment_method = 'delivery' then
    insert into public.order_shipping_addresses (
      order_id, postal_code, prefecture, city, address_line1, address_line2, recipient_name, phone
    ) values (
      v_order_id, p_shipping_postal_code, btrim(p_shipping_prefecture), btrim(p_shipping_city),
      btrim(p_shipping_address_line1), nullif(btrim(p_shipping_address_line2), ''),
      btrim(p_shipping_recipient_name), btrim(p_shipping_phone)
    );
  end if;

  insert into public.patient_order_events (order_id, event_type, actor_type, actor_identifier, to_status)
  values (v_order_id, 'created', p_actor_type, btrim(p_actor_identifier), 'received');
  return v_order_id;
end;
$$;

revoke execute on function public.create_portal_patient_order(text, uuid, jsonb, text, text, text, text, text, text, text, text, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_portal_patient_order(text, uuid, jsonb, text, text, text, text, text, text, text, text, uuid, text, text, text)
  to service_role;

-- rollback:
-- drop function if exists public.create_portal_patient_order(text, uuid, jsonb, text, text, text, text, text, text, text, text, uuid, text, text, text);
-- drop table if exists public.order_shipping_addresses;

-- 確認:
-- select tablename, rowsecurity from pg_tables where schemaname='public' and tablename='order_shipping_addresses';
-- select proname from pg_proc where proname='create_portal_patient_order';
