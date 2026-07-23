-- 同じメールアドレスを複数の医院担当者・認証アカウントで使用できるようにする。
-- パスワード再設定は担当者IDとメールアドレスの組み合わせで対象を特定する。
drop index if exists public.clinic_contacts_email_per_clinic;
drop index if exists public.clinic_users_email_key;

