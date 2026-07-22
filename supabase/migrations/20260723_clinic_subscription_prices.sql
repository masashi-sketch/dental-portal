-- 目的: 医院ごと・商品ごとの3ヶ月／6ヶ月定期購入価格を管理する。
-- 3NF: 期間別価格は医院×商品に従属する独立した価格設定として同じ交差表へ保存する。
--      NULLは医院通常価格へのフォールバックを表し、同額の重複保存を避ける。

alter table public.clinic_product_settings
  add column subscription_3_month_price integer
  check (subscription_3_month_price is null or subscription_3_month_price >= 0),
  add column subscription_6_month_price integer
  check (subscription_6_month_price is null or subscription_6_month_price >= 0);

comment on column public.clinic_product_settings.clinic_price
  is '医院通常価格。NULLの場合はproducts.price（基準価格）を使用する。';
comment on column public.clinic_product_settings.subscription_3_month_price
  is '3ヶ月定期購入の月額。NULLの場合は医院通常価格を使用する。';
comment on column public.clinic_product_settings.subscription_6_month_price
  is '6ヶ月定期購入の月額。NULLの場合は医院通常価格を使用する。';

-- 確認:
-- select s.customer_code, s.product_id, coalesce(s.clinic_price, p.price) as clinic_price,
--        coalesce(s.subscription_3_month_price, s.clinic_price, p.price) as three_month_price,
--        coalesce(s.subscription_6_month_price, s.clinic_price, p.price) as six_month_price
-- from public.clinic_product_settings s join public.products p on p.id = s.product_id limit 20;
-- 戻し方:
-- alter table public.clinic_product_settings
--   drop column subscription_6_month_price,
--   drop column subscription_3_month_price;
