-- 注文作成の原子性と、通信再送時の二重登録防止。
alter table public.patient_orders
  add column if not exists idempotency_key uuid;

create unique index if not exists idx_patient_orders_idempotency
  on public.patient_orders (customer_code, idempotency_key)
  where idempotency_key is not null;

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
    unit_snapshot, image_type_snapshot, daily_amount_snapshot,
    volume_snapshot, caution_snapshot
  ) values (
    v_order_id, v_product.id, v_product.name, v_product.price, p_quantity,
    v_product.unit, v_product.image_type, v_product.daily_amount,
    v_product.volume, v_product.caution
  );
  return v_order_id;
end;
$$;

revoke execute on function public.create_internal_patient_order(text, uuid, uuid, integer, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_internal_patient_order(text, uuid, uuid, integer, text, uuid)
  to service_role;
