-- Shopify接続前の「定期購入申込」を実受注・外部契約から分離して管理する。
-- 申込、明細、配送先スナップショット、監査イベントを第3正規形で保持する。

create table public.patient_subscription_requests (
  id                  uuid primary key default gen_random_uuid(),
  request_number      bigint generated always as identity unique,
  customer_code       text not null references public.clinics (customer_code) on delete restrict,
  patient_id          uuid not null references public.patients (id) on delete restrict,
  term_months         smallint not null check (term_months in (3, 6)),
  fulfillment_method  text not null check (fulfillment_method in ('pickup', 'delivery')),
  status              text not null default 'submitted'
                       check (status in ('submitted', 'approved', 'rejected', 'canceled')),
  idempotency_key     uuid not null,
  version             integer not null default 1 check (version > 0),
  submitted_at        timestamptz not null default now(),
  reviewed_at         timestamptz,
  canceled_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (customer_code, idempotency_key)
);

create index idx_subscription_requests_patient
  on public.patient_subscription_requests (patient_id, submitted_at desc);
create index idx_subscription_requests_bgj
  on public.patient_subscription_requests (status, submitted_at desc);
create trigger trg_subscription_requests_updated_at before update on public.patient_subscription_requests
  for each row execute function public.set_updated_at_generic();

create table public.patient_subscription_request_items (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null references public.patient_subscription_requests (id) on delete cascade,
  product_id         uuid references public.products (id) on delete set null,
  product_name       text not null,
  unit_price         integer not null check (unit_price >= 0),
  quantity           integer not null check (quantity between 1 and 100),
  image_url_snapshot text,
  created_at         timestamptz not null default now(),
  unique (request_id, product_id)
);
create index idx_subscription_request_items_request
  on public.patient_subscription_request_items (request_id);

create table public.patient_subscription_request_destinations (
  request_id              uuid primary key references public.patient_subscription_requests (id) on delete cascade,
  delivery_destination_id uuid not null references public.delivery_destinations (id) on delete restrict,
  label                   text not null,
  postal_code             text not null,
  prefecture              text not null,
  city                    text not null,
  address_line1           text not null,
  address_line2           text,
  recipient_name          text not null,
  phone                   text not null,
  created_at              timestamptz not null default now()
);
create index idx_subscription_request_destination_source
  on public.patient_subscription_request_destinations (delivery_destination_id);

create table public.patient_subscription_request_events (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null references public.patient_subscription_requests (id) on delete cascade,
  event_type       text not null check (event_type in ('submitted', 'approved', 'rejected', 'canceled')),
  actor_type       text not null check (actor_type in ('patient', 'bgj', 'system')),
  actor_identifier text not null,
  from_status      text check (from_status is null or from_status in ('submitted', 'approved', 'rejected', 'canceled')),
  to_status        text not null check (to_status in ('submitted', 'approved', 'rejected', 'canceled')),
  reason           text,
  created_at       timestamptz not null default now()
);
create index idx_subscription_request_events_request
  on public.patient_subscription_request_events (request_id, created_at);

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
  if p_quantity not between 1 and 100 or p_term_months not in (3, 6)
     or p_fulfillment_method not in ('pickup', 'delivery') then
    raise exception '申込内容が不正です。';
  end if;
  if nullif(btrim(p_actor_identifier), '') is null or length(p_actor_identifier) > 320 then
    raise exception '操作者が不正です。';
  end if;
  if not exists (select 1 from public.patients where id = p_patient_id and customer_code = p_customer_code and status = '有効') then
    raise exception '患者が見つかりません。';
  end if;
  select product.* into v_product from public.products product
   where product.id = p_product_id and product.status = '公開' and product.subscription_available;
  if not found or exists (
    select 1 from public.clinic_product_settings setting
     where setting.customer_code = p_customer_code and setting.product_id = p_product_id and not setting.is_visible
  ) then raise exception '選択できない商品です。'; end if;
  select case p_term_months
           when 3 then coalesce(setting.subscription_3_month_price, setting.clinic_price, v_product.price)
           else coalesce(setting.subscription_6_month_price, setting.clinic_price, v_product.price)
         end into v_unit_price
    from (select 1) seed
    left join public.clinic_product_settings setting
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
    insert into public.patient_subscription_requests
      (customer_code, patient_id, term_months, fulfillment_method, idempotency_key)
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
  insert into public.patient_subscription_request_events
    (request_id, event_type, actor_type, actor_identifier, to_status)
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
  if p_actor_type not in ('patient', 'bgj', 'system') or nullif(btrim(p_actor_identifier), '') is null then
    raise exception '操作者が不正です。';
  end if;
  if not (
    (v_current.status = 'submitted' and p_to_status in ('approved', 'rejected', 'canceled')) or
    (v_current.status = 'approved' and p_to_status = 'canceled' and p_actor_type in ('bgj', 'system'))
  ) then raise exception '許可されていない状態遷移です。'; end if;
  if p_actor_type = 'patient' and (v_current.status <> 'submitted' or p_to_status <> 'canceled') then
    raise exception '患者が取り消せるのは受付中の申込だけです。';
  end if;
  if p_to_status = 'rejected' and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception '却下理由を入力してください。';
  end if;
  update public.patient_subscription_requests set
    status = p_to_status, version = version + 1,
    reviewed_at = case when p_to_status in ('approved', 'rejected') then now() else reviewed_at end,
    canceled_at = case when p_to_status = 'canceled' then now() else canceled_at end
   where id = p_request_id returning * into v_updated;
  insert into public.patient_subscription_request_events
    (request_id, event_type, actor_type, actor_identifier, from_status, to_status, reason)
  values (p_request_id, p_to_status, p_actor_type, btrim(p_actor_identifier), v_current.status, p_to_status, nullif(btrim(coalesce(p_reason, '')), ''));
  return v_updated;
end;
$$;

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

alter table public.patient_subscription_requests enable row level security;
alter table public.patient_subscription_request_items enable row level security;
alter table public.patient_subscription_request_destinations enable row level security;
alter table public.patient_subscription_request_events enable row level security;

revoke execute on function public.create_patient_subscription_request(text, uuid, uuid, integer, integer, text, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.create_patient_subscription_request(text, uuid, uuid, integer, integer, text, uuid, uuid, text) to service_role;
revoke execute on function public.transition_patient_subscription_request(uuid, integer, text, text, text, text) from public, anon, authenticated;
grant execute on function public.transition_patient_subscription_request(uuid, integer, text, text, text, text) to service_role;
