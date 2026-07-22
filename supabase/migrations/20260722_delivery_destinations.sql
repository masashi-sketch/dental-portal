-- 目的: 医院・患者が複数の送り先を持ち、注文時に選択した送り先を履歴保存する。
-- 影響: delivery_destinationsを追加し、order_shipping_addressesを注文配送先へ拡張する。
-- 既存データ: 自宅配送の過去住所から患者送り先を作成して関連付ける。過去の医院受取注文は変更しない。

create table public.delivery_destinations (
  id uuid primary key default gen_random_uuid(),
  clinic_customer_code text references public.clinics (customer_code) on delete restrict,
  patient_id uuid references public.patients (id) on delete restrict,
  label text not null check (length(btrim(label)) between 1 and 50),
  postal_code text not null check (postal_code ~ '^[0-9]{3}-[0-9]{4}$'),
  prefecture text not null check (length(prefecture) between 2 and 4),
  city text not null check (length(city) between 1 and 100),
  address_line1 text not null check (length(address_line1) between 1 and 200),
  address_line2 text check (address_line2 is null or length(address_line2) <= 200),
  recipient_name text not null check (length(recipient_name) between 1 and 100),
  phone text not null check (
    phone ~ '^[0-9+() -]{8,30}$'
    and length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 15
  ),
  is_default boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(clinic_customer_code, patient_id) = 1)
);

create index idx_delivery_destinations_clinic_active on public.delivery_destinations (clinic_customer_code, created_at)
  where deleted_at is null and clinic_customer_code is not null;
create index idx_delivery_destinations_patient_active on public.delivery_destinations (patient_id, created_at)
  where deleted_at is null and patient_id is not null;
create unique index idx_delivery_destinations_clinic_default on public.delivery_destinations (clinic_customer_code)
  where deleted_at is null and is_default and clinic_customer_code is not null;
create unique index idx_delivery_destinations_patient_default on public.delivery_destinations (patient_id)
  where deleted_at is null and is_default and patient_id is not null;
create trigger trg_delivery_destinations_updated_at before update on public.delivery_destinations
  for each row execute function public.set_updated_at_generic();

insert into public.delivery_destinations (
  patient_id, label, postal_code, prefecture, city, address_line1, address_line2,
  recipient_name, phone, is_default, created_at
)
select distinct on (
  orders.patient_id, address.postal_code, address.prefecture, address.city,
  address.address_line1, coalesce(address.address_line2, ''), address.recipient_name, address.phone
)
  orders.patient_id, '過去注文配送先', address.postal_code, address.prefecture, address.city,
  address.address_line1, address.address_line2, address.recipient_name, address.phone, false,
  address.created_at
from public.order_shipping_addresses address
join public.patient_orders orders on orders.id = address.order_id
order by orders.patient_id, address.postal_code, address.prefecture, address.city,
  address.address_line1, coalesce(address.address_line2, ''), address.recipient_name, address.phone,
  address.created_at;

with first_destination as (
  select distinct on (patient_id) id from public.delivery_destinations
  where patient_id is not null order by patient_id, created_at, id
)
update public.delivery_destinations destination set is_default = true
where destination.id in (select id from first_destination);

alter table public.order_shipping_addresses rename to order_delivery_destinations;
alter table public.order_delivery_destinations
  add column delivery_destination_id uuid,
  add column label text;

update public.order_delivery_destinations snapshot
set delivery_destination_id = destination.id,
    label = destination.label
from public.patient_orders orders, public.delivery_destinations destination
where orders.id = snapshot.order_id
  and destination.patient_id = orders.patient_id
  and destination.postal_code = snapshot.postal_code
  and destination.prefecture = snapshot.prefecture
  and destination.city = snapshot.city
  and destination.address_line1 = snapshot.address_line1
  and coalesce(destination.address_line2, '') = coalesce(snapshot.address_line2, '')
  and destination.recipient_name = snapshot.recipient_name
  and destination.phone = snapshot.phone;

alter table public.order_delivery_destinations
  alter column delivery_destination_id set not null,
  alter column label set not null,
  add constraint order_delivery_destinations_source_fkey
    foreign key (delivery_destination_id) references public.delivery_destinations (id) on delete restrict;
create index idx_order_delivery_destinations_source
  on public.order_delivery_destinations (delivery_destination_id);

create or replace function public.guard_delivery_destination_delete()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception '送り先は物理削除できません。'; end if;
  if old.clinic_customer_code is distinct from new.clinic_customer_code
     or old.patient_id is distinct from new.patient_id then
    raise exception '送り先の所有者は変更できません。';
  end if;
  if old.deleted_at is null and new.deleted_at is not null and exists (
    select 1 from public.order_delivery_destinations snapshot
    join public.patient_orders orders on orders.id = snapshot.order_id
    where snapshot.delivery_destination_id = old.id
      and orders.status not in ('completed', 'canceled')
  ) then raise exception '進行中の注文で使用している送り先は削除できません。'; end if;
  return new;
end;
$$;
create trigger trg_delivery_destinations_guard_update before update of clinic_customer_code, patient_id, deleted_at
  on public.delivery_destinations for each row execute function public.guard_delivery_destination_delete();
create trigger trg_delivery_destinations_guard_delete before delete
  on public.delivery_destinations for each row execute function public.guard_delivery_destination_delete();

create or replace function public.create_delivery_destination(
  p_clinic_customer_code text, p_patient_id uuid, p_label text, p_postal_code text,
  p_prefecture text, p_city text, p_address_line1 text, p_address_line2 text,
  p_recipient_name text, p_phone text, p_is_default boolean
)
returns public.delivery_destinations language plpgsql security definer set search_path = public as $$
declare v_destination public.delivery_destinations%rowtype; v_make_default boolean;
begin
  if num_nonnulls(p_clinic_customer_code, p_patient_id) <> 1 then raise exception '送り先の所有者が不正です。'; end if;
  if p_patient_id is not null and not exists (select 1 from public.patients where id = p_patient_id and status = '有効') then raise exception '患者が見つかりません。'; end if;
  if p_clinic_customer_code is not null and not exists (select 1 from public.clinics where customer_code = p_clinic_customer_code) then raise exception '医院が見つかりません。'; end if;
  v_make_default := coalesce(p_is_default, false) or not exists (
    select 1 from public.delivery_destinations where deleted_at is null
      and ((p_patient_id is not null and patient_id = p_patient_id)
        or (p_clinic_customer_code is not null and clinic_customer_code = p_clinic_customer_code))
  );
  if v_make_default then
    update public.delivery_destinations set is_default = false where deleted_at is null
      and ((p_patient_id is not null and patient_id = p_patient_id)
        or (p_clinic_customer_code is not null and clinic_customer_code = p_clinic_customer_code));
  end if;
  insert into public.delivery_destinations (
    clinic_customer_code, patient_id, label, postal_code, prefecture, city,
    address_line1, address_line2, recipient_name, phone, is_default
  ) values (
    p_clinic_customer_code, p_patient_id, btrim(p_label), p_postal_code, btrim(p_prefecture),
    btrim(p_city), btrim(p_address_line1), nullif(btrim(p_address_line2), ''),
    btrim(p_recipient_name), btrim(p_phone), v_make_default
  ) returning * into v_destination;
  return v_destination;
end;
$$;

create or replace function public.set_default_delivery_destination(p_destination_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_destination public.delivery_destinations%rowtype;
begin
  select * into v_destination from public.delivery_destinations where id = p_destination_id and deleted_at is null for update;
  if not found then raise exception '送り先が見つかりません。'; end if;
  update public.delivery_destinations set is_default = false where deleted_at is null and id <> v_destination.id
    and ((v_destination.patient_id is not null and patient_id = v_destination.patient_id)
      or (v_destination.clinic_customer_code is not null and clinic_customer_code = v_destination.clinic_customer_code));
  update public.delivery_destinations set is_default = true where id = v_destination.id;
end;
$$;

create or replace function public.archive_delivery_destination(p_destination_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_destination public.delivery_destinations%rowtype; v_replacement_id uuid;
begin
  select * into v_destination from public.delivery_destinations where id = p_destination_id and deleted_at is null for update;
  if not found then raise exception '送り先が見つかりません。'; end if;
  update public.delivery_destinations set deleted_at = now(), is_default = false where id = v_destination.id;
  if v_destination.is_default then
    select id into v_replacement_id from public.delivery_destinations where deleted_at is null
      and ((v_destination.patient_id is not null and patient_id = v_destination.patient_id)
        or (v_destination.clinic_customer_code is not null and clinic_customer_code = v_destination.clinic_customer_code))
      order by created_at, id limit 1;
    if v_replacement_id is not null then update public.delivery_destinations set is_default = true where id = v_replacement_id; end if;
  end if;
end;
$$;

drop function if exists public.create_portal_patient_order(text, uuid, jsonb, text, text, text, text, text, text, text, text, uuid, text, text, text);
create function public.create_portal_patient_order(
  p_customer_code text, p_patient_id uuid, p_items jsonb, p_fulfillment_method text,
  p_delivery_destination_id uuid, p_idempotency_key uuid, p_created_via text,
  p_actor_type text, p_actor_identifier text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid; v_item_count integer; v_distinct_product_count integer;
  v_available_product_count integer; v_destination public.delivery_destinations%rowtype;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception '商品は1〜50種類で指定してください。'; end if;
  if p_fulfillment_method not in ('pickup', 'delivery') then raise exception '受け取り方法が不正です。'; end if;
  if not ((p_created_via = 'clinic_portal' and p_actor_type = 'clinic') or (p_created_via = 'bgj_portal' and p_actor_type = 'bgj')) then raise exception '登録経路が不正です。'; end if;
  if nullif(btrim(p_actor_identifier), '') is null or length(p_actor_identifier) > 320 then raise exception '操作者が不正です。'; end if;
  select id into v_order_id from public.patient_orders where customer_code = p_customer_code and idempotency_key = p_idempotency_key;
  if v_order_id is not null then return v_order_id; end if;
  if not exists (select 1 from public.patients where id = p_patient_id and customer_code = p_customer_code and status = '有効') then raise exception '患者が見つかりません。'; end if;
  select * into v_destination from public.delivery_destinations where id = p_delivery_destination_id and deleted_at is null for share;
  if not found then raise exception '送り先が見つかりません。'; end if;
  if p_fulfillment_method = 'pickup' and v_destination.clinic_customer_code is distinct from p_customer_code then raise exception '医院受け取りでは注文医院の送り先を選択してください。'; end if;
  if p_fulfillment_method = 'delivery' and v_destination.patient_id is distinct from p_patient_id then raise exception '自宅配送では注文患者の送り先を選択してください。'; end if;
  with requested_items as (
    select (item->>'productId')::uuid product_id, (item->>'quantity')::integer quantity from jsonb_array_elements(p_items) item
  ) select count(*), count(distinct product_id) into v_item_count, v_distinct_product_count from requested_items where quantity between 1 and 100;
  if v_item_count <> jsonb_array_length(p_items) or v_distinct_product_count <> v_item_count then raise exception '商品または数量が不正です。'; end if;
  with requested_items as (select (item->>'productId')::uuid product_id from jsonb_array_elements(p_items) item)
  select count(*) into v_available_product_count from requested_items requested
  join public.products product on product.id = requested.product_id and product.status = '公開'
  where not exists (select 1 from public.clinic_product_settings setting where setting.customer_code = p_customer_code and setting.product_id = requested.product_id and setting.is_visible = false);
  if v_available_product_count <> v_item_count then raise exception '選択できない商品が含まれています。'; end if;
  begin
    insert into public.patient_orders (customer_code, patient_id, fulfillment_method, order_type, status, source, created_via, sync_status, idempotency_key)
    values (p_customer_code, p_patient_id, p_fulfillment_method, 'one_time', 'received', 'internal', p_created_via, 'local', p_idempotency_key)
    returning id into v_order_id;
  exception when unique_violation then
    select id into v_order_id from public.patient_orders where customer_code = p_customer_code and idempotency_key = p_idempotency_key;
    if v_order_id is not null then return v_order_id; end if; raise;
  end;
  insert into public.patient_order_items (order_id, product_id, product_name, unit_price, quantity, unit_snapshot, image_type_snapshot, daily_amount_snapshot, volume_snapshot, caution_snapshot)
  select v_order_id, product.id, product.name, product.price, requested.quantity, product.unit, product.image_type, product.daily_amount, product.volume, product.caution
  from jsonb_to_recordset(p_items) requested("productId" uuid, quantity integer) join public.products product on product.id = requested."productId";
  insert into public.order_delivery_destinations (order_id, delivery_destination_id, label, postal_code, prefecture, city, address_line1, address_line2, recipient_name, phone)
  values (v_order_id, v_destination.id, v_destination.label, v_destination.postal_code, v_destination.prefecture, v_destination.city, v_destination.address_line1, v_destination.address_line2, v_destination.recipient_name, v_destination.phone);
  insert into public.patient_order_events (order_id, event_type, actor_type, actor_identifier, to_status)
  values (v_order_id, 'created', p_actor_type, btrim(p_actor_identifier), 'received');
  return v_order_id;
end;
$$;

revoke execute on function public.create_internal_patient_order(text, uuid, uuid, integer, text, uuid) from service_role;
revoke execute on function public.create_bgj_patient_order(text, uuid, jsonb, uuid, text) from service_role;
revoke execute on function public.create_portal_patient_order(text, uuid, jsonb, text, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_portal_patient_order(text, uuid, jsonb, text, uuid, uuid, text, text, text) to service_role;
revoke execute on function public.create_delivery_destination(text, uuid, text, text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_delivery_destination(text, uuid, text, text, text, text, text, text, text, text, boolean) to service_role;
revoke execute on function public.set_default_delivery_destination(uuid), public.archive_delivery_destination(uuid) from public, anon, authenticated;
grant execute on function public.set_default_delivery_destination(uuid), public.archive_delivery_destination(uuid) to service_role;
alter table public.delivery_destinations enable row level security;
alter table public.order_delivery_destinations enable row level security;

-- 確認:
-- select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('delivery_destinations','order_delivery_destinations');
-- select id, clinic_customer_code, patient_id, label, is_default, deleted_at from public.delivery_destinations order by created_at;
-- 戻し方: 先に旧アプリへ戻し、この移行後に作られた注文が無いことを確認する。
-- そのうえでバックアップから復元する。新規の医院受取注文にも配送先スナップショットが
-- 作られるため、データを保持したまま旧order_shipping_addresses構造へ単純に戻すことはできない。
