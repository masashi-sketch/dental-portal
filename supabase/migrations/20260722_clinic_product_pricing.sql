-- 目的: BGJ基準価格、契約仕切値、医院価格（患者表示価格）を分離する。
-- 3NF: 仕切値はproducts.priceとclinic_terms.wholesale_rateから都度算出し、保存しない。
--      医院固有の価格だけを医院×商品の交差テーブルに保存する。

alter table public.clinic_product_settings
  add column clinic_price integer
  check (clinic_price is null or clinic_price >= 0);

alter table public.clinic_terms
  add constraint clinic_terms_wholesale_rate_range
  check (wholesale_rate between 0 and 100);

alter table public.patient_order_items
  add column image_url_snapshot text;

-- 既存注文明細は、商品が残っている場合だけ現在の商品画像で補完する。
update public.patient_order_items item
set image_url_snapshot = product.image_url
from public.products product
where product.id = item.product_id
  and item.image_url_snapshot is null;

create or replace function public.create_portal_patient_order(
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
  with requested_items as (select (item->>'productId')::uuid product_id, (item->>'quantity')::integer quantity from jsonb_array_elements(p_items) item)
  select count(*), count(distinct product_id) into v_item_count, v_distinct_product_count from requested_items where quantity between 1 and 100;
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
  insert into public.patient_order_items (order_id, product_id, product_name, unit_price, quantity, unit_snapshot, image_type_snapshot, image_url_snapshot, daily_amount_snapshot, volume_snapshot, caution_snapshot)
  select v_order_id, product.id, product.name, coalesce(setting.clinic_price, product.price), requested.quantity,
    product.unit, product.image_type, product.image_url, product.daily_amount, product.volume, product.caution
  from jsonb_to_recordset(p_items) requested("productId" uuid, quantity integer)
  join public.products product on product.id = requested."productId"
  left join public.clinic_product_settings setting on setting.customer_code = p_customer_code and setting.product_id = product.id;
  insert into public.order_delivery_destinations (order_id, delivery_destination_id, label, postal_code, prefecture, city, address_line1, address_line2, recipient_name, phone)
  values (v_order_id, v_destination.id, v_destination.label, v_destination.postal_code, v_destination.prefecture, v_destination.city, v_destination.address_line1, v_destination.address_line2, v_destination.recipient_name, v_destination.phone);
  insert into public.patient_order_events (order_id, event_type, actor_type, actor_identifier, to_status)
  values (v_order_id, 'created', p_actor_type, btrim(p_actor_identifier), 'received');
  return v_order_id;
end;
$$;

revoke execute on function public.create_portal_patient_order(text, uuid, jsonb, text, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_portal_patient_order(text, uuid, jsonb, text, uuid, uuid, text, text, text) to service_role;

-- 確認:
-- select column_name from information_schema.columns where table_schema='public' and table_name='clinic_product_settings' order by ordinal_position;
-- select p.name, p.price as base_price, t.wholesale_rate,
--        round(p.price * t.wholesale_rate / 100.0) as wholesale_price,
--        coalesce(s.clinic_price, p.price) as patient_price
-- from products p cross join clinics c
-- left join clinic_terms t on t.customer_code=c.customer_code
-- left join clinic_product_settings s on s.customer_code=c.customer_code and s.product_id=p.id limit 20;
-- 戻し方: 旧アプリへ戻した後、create_portal_patient_orderを直前版へ復元し、
-- alter table patient_order_items drop column image_url_snapshot;
-- alter table clinic_product_settings drop column clinic_price;
