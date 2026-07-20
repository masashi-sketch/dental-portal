-- BGJダッシュボード／レポート画面の固定配列を廃止し、実データ集計に置き換える。
-- アラート閾値・レポート集計期間はBGJが自己管理できるよう app_settings に追加する
-- （/bgj/system/settings 画面から編集）。

-- 1. app_settings に閾値・期間設定を追加
alter table public.app_settings
  add column dashboard_followup_days integer not null default 60,
  add column dashboard_dormant_days integer not null default 90,
  add column dashboard_include_never_ordered boolean not null default true,
  add column report_period_months integer not null default 6;

alter table public.app_settings
  add constraint app_settings_followup_days_check check (dashboard_followup_days > 0),
  add constraint app_settings_dormant_days_check check (dashboard_dormant_days > dashboard_followup_days),
  add constraint app_settings_report_period_check check (report_period_months between 1 and 24);

comment on column public.app_settings.dashboard_followup_days is 'この日数以上未注文の得意先を「要フォロー」（medium）として扱う';
comment on column public.app_settings.dashboard_dormant_days is 'この日数以上未注文の得意先を「休眠・解約リスク」（high）として扱う。followup_daysより大きい必要がある';
comment on column public.app_settings.dashboard_include_never_ordered is '1件も注文が無い得意先を、contract_since起点の経過日数でアラート対象に含めるか';
comment on column public.app_settings.report_period_months is 'レポート画面（/bgj/reports）の集計対象月数（現在月を含む直近Nヶ月のローリング窓）';

-- 2. ダッシュボード集計RPC
create or replace function public.get_bgj_dashboard_overview(
  p_followup_days integer,
  p_dormant_days integer,
  p_include_never_ordered boolean
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
month_bounds as (
  select date_trunc('month', current_date)::date as current_month_start
),
months as (
  select generate_series(
    (select current_month_start from month_bounds) - interval '5 months',
    (select current_month_start from month_bounds),
    interval '1 month'
  )::date as month_start
),
clinic_last_order as (
  select
    c.customer_code,
    c.name,
    c.staff_id,
    c.contract_since,
    max(o.order_date) as last_order_date
  from public.clinics c
  left join public.clinic_orders o on o.customer_code = c.customer_code
  group by c.customer_code, c.name, c.staff_id, c.contract_since
),
clinic_follow_status as (
  select
    l.*,
    case
      when l.last_order_date is not null then current_date - l.last_order_date
      when p_include_never_ordered and l.contract_since is not null then current_date - l.contract_since
      else null
    end as days_since_order
  from clinic_last_order l
),
monthly_orders as (
  select
    date_trunc('month', o.order_date)::date as month_start,
    c.staff_id,
    sum(o.amount)::bigint as amount
  from public.clinic_orders o
  join public.clinics c on c.customer_code = o.customer_code
  where o.order_date >= (select min(month_start) from months)
  group by 1, 2
),
staff_list as (
  select id as staff_id, name as staff_name from public.sales_reps
  union all
  select null::uuid, '担当未割当'
),
clinic_month_sales as (
  select
    customer_code,
    coalesce(sum(amount) filter (
      where date_trunc('month', order_date) = (select current_month_start from month_bounds)
    ), 0)::bigint as current_month_amount,
    coalesce(sum(amount) filter (
      where date_trunc('month', order_date) = (select current_month_start from month_bounds) - interval '1 month'
    ), 0)::bigint as prev_month_amount
  from public.clinic_orders
  group by customer_code
),
recent_order_rows as (
  select
    o.id,
    o.customer_code,
    c.name as clinic_name,
    coalesce(sr.name, '担当未割当') as staff_name,
    o.amount,
    o.order_date
  from public.clinic_orders o
  join public.clinics c on c.customer_code = o.customer_code
  left join public.sales_reps sr on sr.id = c.staff_id
  order by o.order_date desc, o.created_at desc
  limit 5
),
ranking_rows as (
  select
    c.customer_code,
    c.name as clinic_name,
    coalesce(sr.name, '担当未割当') as staff_name,
    s.current_month_amount,
    case
      when s.prev_month_amount is null or s.prev_month_amount = 0 then null
      else round((s.current_month_amount - s.prev_month_amount) / s.prev_month_amount::numeric * 100, 1)
    end as growth_pct
  from public.clinics c
  join clinic_month_sales s on s.customer_code = c.customer_code
  left join public.sales_reps sr on sr.id = c.staff_id
  where s.current_month_amount > 0
  order by s.current_month_amount desc
  limit 5
),
alert_rows as (
  select
    f.customer_code,
    f.name,
    f.days_since_order,
    case
      when f.days_since_order is not null and f.days_since_order >= p_dormant_days then 'high'
      when f.days_since_order is not null and f.days_since_order >= p_followup_days then 'medium'
      when f.staff_id is null then 'medium'
      else null
    end as level,
    array_remove(array[
      case when f.days_since_order is not null and f.days_since_order >= p_followup_days
        then f.days_since_order::text || '日以上未注文' end,
      case when f.staff_id is null then '担当未割当' end
    ], null) as issue_parts
  from clinic_follow_status f
),
alert_final as (
  select customer_code, name, level, days_since_order,
    array_to_string(issue_parts, '・') as issue
  from alert_rows
  where level is not null
  order by (level = 'high') desc, days_since_order desc nulls last
  limit 20
)
select jsonb_build_object(
  'generatedAt', now(),
  'kpis', jsonb_build_object(
    'totalClinicCount', (select count(*) from public.clinics),
    'totalClinicCountDelta', (
      select count(*) from public.clinics
      where contract_since >= (select current_month_start from month_bounds)
    ),
    'currentMonthSalesTotal', (
      select coalesce(sum(current_month_amount), 0) from clinic_month_sales
    ),
    'currentMonthSalesGrowthPct', (
      select case
        when sum(prev_month_amount) is null or sum(prev_month_amount) = 0 then null
        else round((sum(current_month_amount) - sum(prev_month_amount)) / sum(prev_month_amount)::numeric * 100, 1)
      end
      from clinic_month_sales
    ),
    'followUpCount', (
      select count(*) from clinic_follow_status
      where days_since_order is not null and days_since_order >= p_followup_days
    ),
    'dormantRiskCount', (
      select count(*) from clinic_follow_status
      where days_since_order is not null and days_since_order >= p_dormant_days
    )
  ),
  'alerts', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'customerCode', a.customer_code,
      'name', a.name,
      'level', a.level,
      'issue', a.issue,
      'daysSinceLastOrder', a.days_since_order
    )), '[]'::jsonb)
    from alert_final a
  ),
  'monthlySales', jsonb_build_object(
    'months', (
      select jsonb_agg(jsonb_build_object(
        'month', to_char(m.month_start, 'YYYY-MM'),
        'label', extract(month from m.month_start)::integer::text || '月'
      ) order by m.month_start)
      from months m
    ),
    'overall', (
      select jsonb_agg(coalesce(mo.amount, 0) order by m.month_start)
      from months m
      left join (
        select month_start, sum(amount)::bigint as amount from monthly_orders group by month_start
      ) mo on mo.month_start = m.month_start
    ),
    'byStaff', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'staffId', sl.staff_id,
        'staffName', sl.staff_name,
        'values', (
          select jsonb_agg(coalesce(mo.amount, 0) order by m.month_start)
          from months m
          left join monthly_orders mo
            on mo.month_start = m.month_start
            and mo.staff_id is not distinct from sl.staff_id
        )
      )), '[]'::jsonb)
      from staff_list sl
    )
  ),
  'recentOrders', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'customerCode', r.customer_code,
      'clinicName', r.clinic_name,
      'staffName', r.staff_name,
      'amount', r.amount,
      'orderDate', r.order_date
    )), '[]'::jsonb)
    from recent_order_rows r
  ),
  'ranking', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'customerCode', r.customer_code,
      'clinicName', r.clinic_name,
      'staffName', r.staff_name,
      'currentMonthAmount', r.current_month_amount,
      'growthPct', r.growth_pct
    )), '[]'::jsonb)
    from ranking_rows r
  )
);
$$;

revoke execute on function public.get_bgj_dashboard_overview(integer, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.get_bgj_dashboard_overview(integer, integer, boolean)
  to service_role;

-- 3. レポート集計RPC
create or replace function public.get_bgj_sales_report(p_months integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
month_bounds as (
  select date_trunc('month', current_date)::date as current_month_start
),
months as (
  select generate_series(
    (select current_month_start from month_bounds) - (p_months - 1) * interval '1 month',
    (select current_month_start from month_bounds),
    interval '1 month'
  )::date as month_start
),
window_orders as (
  select o.customer_code, o.order_date, o.amount, c.staff_id, c.area
  from public.clinic_orders o
  join public.clinics c on c.customer_code = o.customer_code
  where o.order_date >= (select min(month_start) from months)
    and o.order_date < (select current_month_start from month_bounds) + interval '1 month'
),
prev_year_orders as (
  select o.amount
  from public.clinic_orders o
  where o.order_date >= (select min(month_start) from months) - interval '1 year'
    and o.order_date < ((select current_month_start from month_bounds) + interval '1 month') - interval '1 year'
),
monthly_trend_rows as (
  select
    m.month_start,
    coalesce(sum(w.amount), 0)::bigint as sales_amount,
    count(w.customer_code) as order_count
  from months m
  left join window_orders w on date_trunc('month', w.order_date)::date = m.month_start
  group by m.month_start
),
staff_list as (
  select id as staff_id, name as staff_name from public.sales_reps
  union all
  select null::uuid, '担当未割当'
),
staff_clinic_count as (
  select staff_id, count(*) as clinic_count from public.clinics group by staff_id
),
staff_month_sales as (
  select c.staff_id, coalesce(sum(o.amount), 0)::bigint as amount
  from public.clinics c
  join public.clinic_orders o on o.customer_code = c.customer_code
  where date_trunc('month', o.order_date) = (select current_month_start from month_bounds)
  group by c.staff_id
),
staff_month_visits as (
  select c.staff_id, count(*) as visit_count
  from public.clinics c
  join public.clinic_visits v on v.customer_code = c.customer_code
  where date_trunc('month', v.visit_date) = (select current_month_start from month_bounds)
  group by c.staff_id
),
area_rollup as (
  select
    c.area,
    count(distinct c.customer_code) as clinic_count,
    coalesce(sum(o.amount) filter (
      where date_trunc('month', o.order_date) = (select current_month_start from month_bounds)
    ), 0)::bigint as current_month_sales
  from public.clinics c
  left join public.clinic_orders o on o.customer_code = c.customer_code
  group by c.area
),
top_clinic_rows as (
  select
    c.customer_code,
    c.name,
    coalesce(sr.name, '担当未割当') as staff_name,
    sum(w.amount)::bigint as total_sales
  from window_orders w
  join public.clinics c on c.customer_code = w.customer_code
  left join public.sales_reps sr on sr.id = c.staff_id
  group by c.customer_code, c.name, sr.name
  order by total_sales desc
  limit 5
)
select jsonb_build_object(
  'generatedAt', now(),
  'period', jsonb_build_object(
    'start', to_char((select min(month_start) from months), 'YYYY-MM-DD'),
    'end', to_char((select current_month_start from month_bounds), 'YYYY-MM-DD'),
    'label', to_char((select min(month_start) from months), 'YYYY年MM月') || '〜' ||
             to_char((select current_month_start from month_bounds), 'YYYY年MM月')
  ),
  'summary', jsonb_build_object(
    'totalSales', (select coalesce(sum(sales_amount), 0) from monthly_trend_rows),
    'monthlyAvgSales', (
      select round(coalesce(sum(sales_amount), 0) / p_months::numeric) from monthly_trend_rows
    ),
    'totalOrderCount', (select coalesce(sum(order_count), 0) from monthly_trend_rows),
    'avgOrderValue', (
      select case when sum(order_count) is null or sum(order_count) = 0 then null
        else round(sum(sales_amount) / sum(order_count)::numeric) end
      from monthly_trend_rows
    ),
    'yoySalesGrowthPct', (
      select case
        when (select coalesce(sum(amount), 0) from prev_year_orders) = 0 then null
        else round(
          ((select coalesce(sum(sales_amount), 0) from monthly_trend_rows) -
           (select sum(amount) from prev_year_orders))
          / (select sum(amount) from prev_year_orders)::numeric * 100, 1)
      end
    )
  ),
  'monthlyTrend', (
    select jsonb_agg(jsonb_build_object(
      'month', to_char(month_start, 'YYYY-MM'),
      'label', extract(month from month_start)::integer::text || '月',
      'salesAmount', sales_amount,
      'orderCount', order_count
    ) order by month_start)
    from monthly_trend_rows
  ),
  'byStaff', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'staffId', sl.staff_id,
      'staffName', sl.staff_name,
      'clinicCount', coalesce(cc.clinic_count, 0),
      'currentMonthSales', coalesce(ms.amount, 0),
      'currentMonthVisitCount', coalesce(mv.visit_count, 0),
      'salesPerClinic', case when coalesce(cc.clinic_count, 0) = 0 then null
        else round(coalesce(ms.amount, 0) / cc.clinic_count::numeric) end
    )), '[]'::jsonb)
    from staff_list sl
    left join staff_clinic_count cc on cc.staff_id is not distinct from sl.staff_id
    left join staff_month_sales ms on ms.staff_id is not distinct from sl.staff_id
    left join staff_month_visits mv on mv.staff_id is not distinct from sl.staff_id
  ),
  'byArea', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'area', area,
      'clinicCount', clinic_count,
      'currentMonthSales', current_month_sales
    ) order by current_month_sales desc), '[]'::jsonb)
    from area_rollup
  ),
  'topClinics', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'customerCode', customer_code,
      'name', name,
      'staffName', staff_name,
      'totalSales', total_sales,
      'monthlyAvgSales', round(total_sales / p_months::numeric)
    ) order by total_sales desc), '[]'::jsonb)
    from top_clinic_rows
  )
);
$$;

revoke execute on function public.get_bgj_sales_report(integer)
  from public, anon, authenticated;
grant execute on function public.get_bgj_sales_report(integer)
  to service_role;
