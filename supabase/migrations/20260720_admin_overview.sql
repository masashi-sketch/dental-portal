-- 医院ダッシュボード／コミッション画面の固定値を廃止し、1回のDB呼び出しで
-- 実データの集計結果を返す。決済確定値はShopify連携前のため意図的にnullとする。
create or replace function public.get_admin_overview(p_customer_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
month_bounds as (
  select date_trunc('month', timezone('Asia/Tokyo', now()))::date as current_month_start
),
months as (
  select generate_series(
    (select current_month_start from month_bounds) - interval '5 months',
    (select current_month_start from month_bounds),
    interval '1 month'
  )::date as month_start
),
monthly_internal as (
  select
    date_trunc('month', o.ordered_at at time zone 'Asia/Tokyo')::date as month_start,
    count(distinct o.id)::bigint as order_count,
    coalesce(sum(i.unit_price::bigint * i.quantity), 0)::bigint as reference_amount
  from public.patient_orders o
  join public.patient_order_items i on i.order_id = o.id
  where o.customer_code = p_customer_code
    and o.source = 'internal'
    and o.status <> 'canceled'
    and o.ordered_at >= (
      (select min(month_start) from months)::timestamp at time zone 'Asia/Tokyo'
    )
  group by 1
),
current_product_rows as (
  select
    i.product_name,
    sum(i.quantity)::bigint as quantity,
    sum(i.unit_price::bigint * i.quantity)::bigint as reference_amount
  from public.patient_orders o
  join public.patient_order_items i on i.order_id = o.id
  cross join month_bounds b
  where o.customer_code = p_customer_code
    and o.source = 'internal'
    and o.status <> 'canceled'
    and o.ordered_at >= (b.current_month_start::timestamp at time zone 'Asia/Tokyo')
    and o.ordered_at < ((b.current_month_start + interval '1 month')::timestamp at time zone 'Asia/Tokyo')
  group by i.product_name
  order by reference_amount desc, i.product_name
),
recent_order_rows as (
  select
    o.id,
    o.ordered_at,
    o.fulfillment_method,
    o.status,
    o.order_type,
    o.source,
    p.name as patient_name,
    coalesce((
      select string_agg(
        oi.product_name || ' × ' || oi.quantity::text,
        '、' order by oi.created_at
      )
      from public.patient_order_items oi
      where oi.order_id = o.id
    ), '商品情報なし') as product_summary
  from public.patient_orders o
  join public.patients p on p.id = o.patient_id
  where o.customer_code = p_customer_code
  order by o.ordered_at desc
  limit 4
),
recent_announcement_rows as (
  select a.id, a.announcement_date, a.tag, a.text
  from public.clinic_announcements a
  where a.customer_code = p_customer_code and a.status = '公開'
  order by a.announcement_date desc, a.created_at desc
  limit 3
)
select jsonb_build_object(
  'generatedAt', now(),
  'counts', jsonb_build_object(
    'patientCount', (
      select count(*) from public.patients p
      where p.customer_code = p_customer_code and p.status = '有効'
    ),
    'publishedAnnouncementCount', (
      select count(*) from public.clinic_announcements a
      where a.customer_code = p_customer_code and a.status = '公開'
    ),
    'activeOrderCount', (
      select count(*) from public.patient_orders o
      where o.customer_code = p_customer_code
        and o.status in ('received', 'preparing', 'ready', 'shipped')
    ),
    'visibleProductCount', (
      select count(*)
      from public.products pr
      where pr.status = '公開'
        and not exists (
          select 1 from public.clinic_product_settings s
          where s.customer_code = p_customer_code
            and s.product_id = pr.id
            and s.is_visible = false
        )
    )
  ),
  'recentOrders', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'orderedAt', r.ordered_at,
      'fulfillmentMethod', r.fulfillment_method,
      'status', r.status,
      'orderType', r.order_type,
      'source', r.source,
      'patientName', r.patient_name,
      'productSummary', r.product_summary
    ) order by r.ordered_at desc), '[]'::jsonb)
    from recent_order_rows r
  ),
  'recentAnnouncements', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'announcementDate', r.announcement_date,
      'tag', r.tag,
      'text', r.text
    ) order by r.announcement_date desc), '[]'::jsonb)
    from recent_announcement_rows r
  ),
  'commerce', jsonb_build_object(
    'integrationStatus', 'awaiting_shopify',
    'commissionRate', (
      select t.commission_rate from public.clinic_terms t
      where t.customer_code = p_customer_code
    ),
    'currentMonth', jsonb_build_object(
      'internalOrderCount', coalesce((
        select m.order_count from monthly_internal m
        where m.month_start = (select current_month_start from month_bounds)
      ), 0),
      'internalOrderAmount', coalesce((
        select m.reference_amount from monthly_internal m
        where m.month_start = (select current_month_start from month_bounds)
      ), 0),
      'confirmedSales', null,
      'confirmedCommission', null
    ),
    'monthly', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'month', to_char(m.month_start, 'YYYY-MM'),
        'label', extract(month from m.month_start)::integer::text || '月',
        'internalOrderCount', coalesce(a.order_count, 0),
        'internalOrderAmount', coalesce(a.reference_amount, 0),
        'confirmedSales', null,
        'confirmedCommission', null
      ) order by m.month_start), '[]'::jsonb)
      from months m
      left join monthly_internal a on a.month_start = m.month_start
    ),
    'products', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'productName', p.product_name,
        'quantity', p.quantity,
        'internalOrderAmount', p.reference_amount,
        'confirmedSales', null,
        'confirmedCommission', null
      ) order by p.reference_amount desc, p.product_name), '[]'::jsonb)
      from current_product_rows p
    )
  )
);
$$;

revoke execute on function public.get_admin_overview(text)
  from public, anon, authenticated;
grant execute on function public.get_admin_overview(text)
  to service_role;
