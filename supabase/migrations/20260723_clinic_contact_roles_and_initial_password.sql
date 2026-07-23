-- 医院担当者の役職マスタ化、および医院ログインの自動採番・初回パスワード変更。

create table if not exists public.clinic_contact_roles (
  role_key text primary key check (role_key in ('physician', 'dentist', 'nurse', 'dental_hygienist', 'receptionist', 'other')),
  label text not null unique,
  sort_order integer not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.clinic_contact_roles(role_key, label, sort_order) values
  ('physician', '医師', 10),
  ('dentist', '歯科医師', 20),
  ('nurse', '看護師', 30),
  ('dental_hygienist', '歯科衛生士', 40),
  ('receptionist', '受付', 50),
  ('other', 'その他', 60)
on conflict (role_key) do update set label = excluded.label, sort_order = excluded.sort_order;

drop trigger if exists trg_clinic_contact_roles_updated_at on public.clinic_contact_roles;
create trigger trg_clinic_contact_roles_updated_at before update on public.clinic_contact_roles
  for each row execute function public.set_updated_at_generic();

alter table public.clinic_contacts add column if not exists role_key text;
update public.clinic_contacts set role_key = case trim(coalesce(title, ''))
  when '医師' then 'physician'
  when '歯科医師' then 'dentist'
  when '看護師' then 'nurse'
  when '歯科衛生士' then 'dental_hygienist'
  when '受付' then 'receptionist'
  else 'other'
end where role_key is null;
alter table public.clinic_contacts alter column role_key set default 'other';
alter table public.clinic_contacts alter column role_key set not null;
alter table public.clinic_contacts drop constraint if exists clinic_contacts_role_key_fkey;
alter table public.clinic_contacts add constraint clinic_contacts_role_key_fkey
  foreign key (role_key) references public.clinic_contact_roles(role_key) on delete restrict;
create index if not exists idx_clinic_contacts_role_key on public.clinic_contacts(role_key);
alter table public.clinic_contacts drop column if exists title;

drop function if exists public.save_clinic_contact(uuid, integer, text, uuid, text, text, text, text, text, boolean, text, text, text[], text[], text, text);
create function public.save_clinic_contact(
  p_contact_id uuid, p_expected_version integer, p_customer_code text, p_clinic_user_id uuid,
  p_name text, p_department text, p_role_key text, p_email text, p_phone text,
  p_is_primary boolean, p_status text, p_notes text, p_email_topics text[], p_phone_topics text[],
  p_actor_type text, p_actor_identifier text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_previous_status text; v_event_type text;
begin
  if nullif(trim(p_name), '') is null or char_length(trim(p_name)) > 100
    or not exists (select 1 from public.clinic_contact_roles where role_key = p_role_key)
    or (nullif(trim(p_email), '') is null and nullif(trim(p_phone), '') is null)
    or p_status not in ('active', 'inactive') or p_actor_type not in ('bgj', 'clinic', 'system')
    or nullif(trim(p_actor_identifier), '') is null then raise exception '担当者入力が不正です'; end if;
  if exists (select 1 from unnest(coalesce(p_email_topics, '{}'::text[]) || coalesce(p_phone_topics, '{}'::text[])) topic
    where topic not in ('webinar', 'orders', 'billing', 'product', 'system', 'sales')) then raise exception '通知種別が不正です'; end if;
  if nullif(trim(p_email), '') is null and coalesce(array_length(p_email_topics, 1), 0) > 0 then raise exception 'メール通知にはメールアドレスが必要です'; end if;
  if nullif(trim(p_phone), '') is null and coalesce(array_length(p_phone_topics, 1), 0) > 0 then raise exception '電話連絡には電話番号が必要です'; end if;
  if p_clinic_user_id is not null and not exists (select 1 from public.clinic_users where id = p_clinic_user_id and customer_code = p_customer_code)
    then raise exception '医院ログインが一致しません'; end if;
  if p_is_primary and p_status = 'active' then
    insert into public.clinic_contact_events(contact_id, event_type, actor_type, actor_identifier)
      select id, 'primary_changed', p_actor_type, p_actor_identifier from public.clinic_contacts
      where customer_code = p_customer_code and id is distinct from p_contact_id and is_primary and status = 'active' and deleted_at is null;
    update public.clinic_contacts set is_primary = false, version = version + 1
      where customer_code = p_customer_code and id is distinct from p_contact_id and is_primary and status = 'active' and deleted_at is null;
  end if;
  if p_contact_id is null then
    insert into public.clinic_contacts(customer_code, clinic_user_id, name, department, role_key, email, phone, is_primary, status, notes)
    values (p_customer_code, p_clinic_user_id, trim(p_name), nullif(trim(p_department), ''), p_role_key,
      lower(nullif(trim(p_email), '')), nullif(trim(p_phone), ''), p_is_primary and p_status = 'active', p_status, nullif(trim(p_notes), ''))
    returning id into v_id; v_event_type := 'created';
  else
    select status into v_previous_status from public.clinic_contacts where id = p_contact_id and customer_code = p_customer_code and deleted_at is null;
    update public.clinic_contacts set clinic_user_id = p_clinic_user_id, name = trim(p_name), department = nullif(trim(p_department), ''),
      role_key = p_role_key, email = lower(nullif(trim(p_email), '')), phone = nullif(trim(p_phone), ''),
      is_primary = p_is_primary and p_status = 'active', status = p_status, notes = nullif(trim(p_notes), ''), version = version + 1
    where id = p_contact_id and customer_code = p_customer_code and deleted_at is null and version = p_expected_version returning id into v_id;
    if v_id is null then raise exception '更新競合'; end if;
    v_event_type := case when v_previous_status = 'active' and p_status = 'inactive' then 'deactivated'
      when v_previous_status = 'inactive' and p_status = 'active' then 'reactivated' else 'updated' end;
    delete from public.clinic_contact_notification_preferences where contact_id = v_id;
  end if;
  update public.clinic_users set name = trim(p_name) where id = p_clinic_user_id;
  insert into public.clinic_contact_notification_preferences(contact_id, topic, channel)
    select v_id, topic, 'email' from (select distinct unnest(coalesce(p_email_topics, '{}'::text[])) topic) topics;
  insert into public.clinic_contact_notification_preferences(contact_id, topic, channel)
    select v_id, topic, 'phone' from (select distinct unnest(coalesce(p_phone_topics, '{}'::text[])) topic) topics;
  insert into public.clinic_contact_events(contact_id, event_type, actor_type, actor_identifier)
    values (v_id, v_event_type, p_actor_type, p_actor_identifier);
  return v_id;
end; $$;

alter table public.clinic_users add column if not exists must_change_password boolean not null default false;
create sequence if not exists public.clinic_user_login_id_seq minvalue 1 maxvalue 999999;
do $$
declare v_next bigint;
begin
  select coalesce(max(substring(login_id from 2)::bigint), 0) + 1 into v_next
  from public.clinic_users where login_id ~ '^A[0-9]{6}$';
  if v_next > 999999 then
    perform setval('public.clinic_user_login_id_seq', 999999, true);
  else
    perform setval('public.clinic_user_login_id_seq', v_next, false);
  end if;
end $$;

create or replace function public.next_clinic_user_login_id() returns text
language plpgsql volatile security definer set search_path = public as $$
declare v_number bigint;
begin
  v_number := nextval('public.clinic_user_login_id_seq');
  if v_number > 999999 then raise exception '医院ログインIDの採番上限に達しました'; end if;
  return 'A' || lpad(v_number::text, 6, '0');
end; $$;

drop function if exists public.save_clinic_contact_login(uuid, text, text, text, text, text, text, text, text);
create function public.save_clinic_contact_login(
  p_contact_id uuid, p_customer_code text, p_password_hash text, p_email text, p_status text,
  p_role_key text, p_actor_type text, p_actor_identifier text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid; v_contact_name text; v_current_role text; v_current_status text;
  v_active_admins integer; v_role_key text := p_role_key; v_event_type text;
begin
  if p_status not in ('有効', '無効') or p_role_key not in ('admin', 'staff', 'viewer')
    or p_actor_type not in ('bgj', 'clinic', 'system') then raise exception 'ログイン入力が不正です'; end if;
  select name, clinic_user_id into v_contact_name, v_user_id from public.clinic_contacts
  where id = p_contact_id and customer_code = p_customer_code and deleted_at is null for update;
  if v_contact_name is null then raise exception '担当者が見つかりません'; end if;
  if v_user_id is null then
    if nullif(p_password_hash, '') is null then raise exception '初期パスワードが必要です'; end if;
    if p_status = '有効' and not exists (select 1 from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id = u.id where u.customer_code = p_customer_code and u.status = '有効' and r.role_key = 'admin') then v_role_key := 'admin'; end if;
    insert into public.clinic_users(customer_code, login_id, password_hash, name, email, status, password_changed_at, must_change_password)
    values (p_customer_code, public.next_clinic_user_login_id(), p_password_hash, v_contact_name, lower(nullif(trim(p_email), '')), p_status, null, true)
    returning id into v_user_id;
    update public.clinic_contacts set clinic_user_id = v_user_id, version = version + 1 where id = p_contact_id;
    insert into public.clinic_user_role_assignments(clinic_user_id, role_key, assigned_by) values(v_user_id, v_role_key, p_actor_identifier);
    v_event_type := 'login_created';
  else
    select u.status, r.role_key into v_current_status, v_current_role from public.clinic_users u left join public.clinic_user_role_assignments r on r.clinic_user_id = u.id where u.id = v_user_id and u.customer_code = p_customer_code for update of u;
    if p_status = '有効' and v_role_key <> 'admin' and not exists (select 1 from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id = u.id where u.customer_code = p_customer_code and u.status = '有効' and r.role_key = 'admin' and u.id <> v_user_id) then v_role_key := 'admin'; end if;
    if v_current_role = 'admin' and (v_role_key <> 'admin' or p_status = '無効') then
      select count(*) into v_active_admins from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id = u.id where u.customer_code = p_customer_code and u.status = '有効' and r.role_key = 'admin';
      if v_active_admins <= 1 then raise exception '最後の管理者は変更・無効化できません'; end if;
    end if;
    update public.clinic_users set name = v_contact_name, email = lower(nullif(trim(p_email), '')), status = p_status,
      password_hash = coalesce(nullif(p_password_hash, ''), password_hash),
      password_changed_at = case when nullif(p_password_hash, '') is not null then now() else password_changed_at end,
      session_version = session_version + case when p_status is distinct from v_current_status or nullif(p_password_hash, '') is not null then 1 else 0 end
    where id = v_user_id;
    insert into public.clinic_user_role_assignments(clinic_user_id, role_key, assigned_by) values(v_user_id, v_role_key, p_actor_identifier)
      on conflict(clinic_user_id) do update set role_key = excluded.role_key, assigned_by = excluded.assigned_by;
    v_event_type := case when p_status = '無効' and v_current_status = '有効' then 'login_disabled' when v_current_role is distinct from v_role_key then 'role_changed' else 'login_updated' end;
  end if;
  insert into public.clinic_contact_events(contact_id, event_type, actor_type, actor_identifier, metadata)
  values(p_contact_id, v_event_type, p_actor_type, p_actor_identifier, jsonb_build_object('clinic_user_id', v_user_id, 'role_key', v_role_key, 'status', p_status));
  return v_user_id;
end; $$;

create or replace function public.set_clinic_user_password(p_clinic_user_id uuid, p_password_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if nullif(p_password_hash, '') is null then raise exception 'パスワードが必要です'; end if;
  update public.clinic_users set password_hash = p_password_hash, password_changed_at = now(), must_change_password = false,
    session_version = session_version + 1, failed_login_attempts = 0, locked_until = null
  where id = p_clinic_user_id returning id into v_id;
  if v_id is null then raise exception '医院ログインが見つかりません'; end if;
  return v_id;
end; $$;

create or replace function public.complete_initial_clinic_password_change(p_clinic_user_id uuid, p_password_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if nullif(p_password_hash, '') is null then raise exception 'パスワードが必要です'; end if;
  update public.clinic_users set password_hash = p_password_hash, password_changed_at = now(), must_change_password = false,
    session_version = session_version + 1, failed_login_attempts = 0, locked_until = null
  where id = p_clinic_user_id and must_change_password returning id into v_id;
  if v_id is null then raise exception '初回パスワード変更の対象が見つかりません'; end if;
  return v_id;
end; $$;

drop function if exists public.get_clinic_session_state(uuid);
create function public.get_clinic_session_state(p_clinic_user_id uuid)
returns table(status text, session_version integer, role_key text, permissions text[], must_change_password boolean)
language sql stable security definer set search_path = public as $$
  select u.status, u.session_version, coalesce(r.role_key, 'admin'),
    array(select p.permission_key from public.clinic_portal_role_permissions p where p.role_key = coalesce(r.role_key, 'admin') order by p.permission_key),
    u.must_change_password
  from public.clinic_users u left join public.clinic_user_role_assignments r on r.clinic_user_id = u.id
  where u.id = p_clinic_user_id;
$$;

alter table public.clinic_contact_roles enable row level security;
revoke all on public.clinic_contact_roles from anon, authenticated;
revoke all on sequence public.clinic_user_login_id_seq from public, anon, authenticated;
revoke execute on function public.next_clinic_user_login_id() from public, anon, authenticated;
revoke execute on function public.save_clinic_contact_login(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.complete_initial_clinic_password_change(uuid, text) from public, anon, authenticated;
revoke execute on function public.save_clinic_contact(uuid, integer, text, uuid, text, text, text, text, text, boolean, text, text, text[], text[], text, text) from public, anon, authenticated;
revoke execute on function public.get_clinic_session_state(uuid) from public, anon, authenticated;
grant all on public.clinic_contact_roles to service_role;
grant usage, select on sequence public.clinic_user_login_id_seq to service_role;
grant execute on function public.next_clinic_user_login_id() to service_role;
grant execute on function public.save_clinic_contact_login(uuid, text, text, text, text, text, text, text) to service_role;
grant execute on function public.complete_initial_clinic_password_change(uuid, text) to service_role;
grant execute on function public.save_clinic_contact(uuid, integer, text, uuid, text, text, text, text, text, boolean, text, text, text[], text[], text, text) to service_role;
grant execute on function public.get_clinic_session_state(uuid) to service_role;

-- 担当者と医院ログインを必須の一対一に統合する。画面上の担当者IDはclinic_users.login_idを使用する。
-- まず同一医院・同一メールの未関連担当者と未関連ログインを対応付ける。
update public.clinic_contacts c set clinic_user_id = u.id
from public.clinic_users u
where c.clinic_user_id is null and c.email is not null and u.email is not null
  and c.customer_code = u.customer_code and lower(c.email) = lower(u.email)
  and not exists (select 1 from public.clinic_contacts linked where linked.clinic_user_id = u.id);

-- メールで特定できない残りは、同一医院内の作成順で対応付ける。
with unlinked_contacts as (
  select id, customer_code, row_number() over (partition by customer_code order by created_at, id) as row_no
  from public.clinic_contacts where clinic_user_id is null and deleted_at is null
), unlinked_users as (
  select u.id, u.customer_code, row_number() over (partition by u.customer_code order by u.created_at, u.id) as row_no
  from public.clinic_users u
  where not exists (select 1 from public.clinic_contacts c where c.clinic_user_id = u.id)
)
update public.clinic_contacts c set clinic_user_id = u.id
from unlinked_contacts c1 join unlinked_users u on u.customer_code = c1.customer_code and u.row_no = c1.row_no
where c.id = c1.id;

-- 未関連担当者には担当者IDと初期パスワードを発行する。
do $$
declare
  v_contact record;
  v_user_id uuid;
  v_portal_role text;
  v_login_email text;
  v_initial_hash constant text := '10ca64707d8c4ca1b5ad3cb58d1d8c6d:4175e32352044798b3b24fbfefd582e36df19e14a52b0749e953e348f9c1b5cfbff87864124da289df6c662ed26923246250984d0e0405c3670efb1ac5af3880';
begin
  for v_contact in select * from public.clinic_contacts where clinic_user_id is null order by customer_code, created_at, id loop
    v_login_email := case when v_contact.email is not null and not exists (
      select 1 from public.clinic_users where lower(email) = lower(v_contact.email)
    ) then lower(v_contact.email) else null end;
    v_portal_role := case when v_contact.status = 'active' and not exists (
      select 1 from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id = u.id
      where u.customer_code = v_contact.customer_code and u.status = '有効' and r.role_key = 'admin'
    ) then 'admin' else 'staff' end;
    insert into public.clinic_users(customer_code, login_id, password_hash, name, email, status, must_change_password)
    values (v_contact.customer_code, public.next_clinic_user_login_id(), v_initial_hash, v_contact.name, v_login_email,
      case when v_contact.status = 'active' and v_contact.deleted_at is null then '有効' else '無効' end, true)
    returning id into v_user_id;
    insert into public.clinic_user_role_assignments(clinic_user_id, role_key, assigned_by)
    values (v_user_id, v_portal_role, 'contact-login-unification');
    update public.clinic_contacts set clinic_user_id = v_user_id where id = v_contact.id;
  end loop;
end $$;

-- 従来の医院ログインだけが存在する場合も、担当者明細から管理できるようプロフィールを補完する。
-- 連絡先が未登録の旧アカウントを保持できるよう、DBの連絡方法CHECKはアプリ検証へ移す。
alter table public.clinic_contacts drop constraint if exists clinic_contacts_contact_method;
insert into public.clinic_contacts(customer_code, clinic_user_id, name, role_key, email, status, notes)
select u.customer_code, u.id, coalesce(nullif(trim(u.name), ''), '移行担当者'), 'other',
  case when u.email is not null and not exists (
    select 1 from public.clinic_contacts c where c.customer_code = u.customer_code and lower(c.email) = lower(u.email) and c.deleted_at is null
  ) then lower(u.email) else null end,
  case when u.status = '有効' then 'active' else 'inactive' end,
  '既存の医院ログインから担当者情報を補完'
from public.clinic_users u
where not exists (select 1 from public.clinic_contacts c where c.clinic_user_id = u.id);

alter table public.clinic_contacts alter column clinic_user_id set not null;
drop index if exists public.clinic_contacts_clinic_user;
alter table public.clinic_contacts drop constraint if exists clinic_contacts_clinic_user_id_key;
alter table public.clinic_contacts add constraint clinic_contacts_clinic_user_id_key unique (clinic_user_id);
alter table public.clinic_users drop constraint if exists clinic_users_id_customer_code_key;
alter table public.clinic_users add constraint clinic_users_id_customer_code_key unique (id, customer_code);
alter table public.clinic_contacts drop constraint if exists clinic_contacts_clinic_user_id_fkey;
alter table public.clinic_contacts add constraint clinic_contacts_clinic_user_customer_fkey
  foreign key (clinic_user_id, customer_code) references public.clinic_users(id, customer_code) on delete restrict;

create or replace function public.create_clinic_contact_with_login(
  p_customer_code text, p_password_hash text, p_portal_role_key text,
  p_name text, p_department text, p_role_key text, p_email text, p_phone text,
  p_is_primary boolean, p_status text, p_notes text, p_email_topics text[], p_phone_topics text[],
  p_actor_type text, p_actor_identifier text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_contact_id uuid;
  v_portal_role_key text := p_portal_role_key;
begin
  if nullif(p_password_hash, '') is null or p_portal_role_key not in ('admin', 'staff', 'viewer')
    or p_status not in ('active', 'inactive') then raise exception '担当者認証入力が不正です'; end if;
  if p_status = 'active' and not exists (
    select 1 from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id = u.id
    where u.customer_code = p_customer_code and u.status = '有効' and r.role_key = 'admin'
  ) then v_portal_role_key := 'admin'; end if;
  insert into public.clinic_users(customer_code, login_id, password_hash, name, email, status, must_change_password)
  values (p_customer_code, public.next_clinic_user_login_id(), p_password_hash, trim(p_name),
    lower(nullif(trim(p_email), '')), case when p_status = 'active' then '有効' else '無効' end, true)
  returning id into v_user_id;
  insert into public.clinic_user_role_assignments(clinic_user_id, role_key, assigned_by)
  values (v_user_id, v_portal_role_key, p_actor_identifier);
  v_contact_id := public.save_clinic_contact(null, 1, p_customer_code, v_user_id, p_name, p_department,
    p_role_key, p_email, p_phone, p_is_primary, p_status, p_notes, p_email_topics, p_phone_topics,
    p_actor_type, p_actor_identifier);
  return v_contact_id;
end; $$;

revoke execute on function public.create_clinic_contact_with_login(text, text, text, text, text, text, text, text, boolean, text, text, text[], text[], text, text) from public, anon, authenticated;
grant execute on function public.create_clinic_contact_with_login(text, text, text, text, text, text, text, text, boolean, text, text, text[], text[], text, text) to service_role;

create or replace function public.sync_clinic_contact_login_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text; v_active_admins integer;
begin
  if new.clinic_user_id is not null
    and (new.deleted_at is not null or new.status = 'inactive')
    and (old.deleted_at is null and old.status = 'active') then
    select role_key into v_role from public.clinic_user_role_assignments where clinic_user_id = new.clinic_user_id;
    if v_role = 'admin' then
      select count(*) into v_active_admins from public.clinic_users u
      join public.clinic_user_role_assignments r on r.clinic_user_id = u.id
      where u.customer_code = new.customer_code and u.status = '有効' and r.role_key = 'admin';
      if v_active_admins <= 1 then raise exception '最後の管理者は無効化できません'; end if;
    end if;
    update public.clinic_users set status = '無効', session_version = session_version + 1
    where id = new.clinic_user_id and status <> '無効';
  elsif new.clinic_user_id is not null and new.deleted_at is null and new.status = 'active'
    and (old.deleted_at is not null or old.status = 'inactive') then
    update public.clinic_users set status = '有効', session_version = session_version + 1
    where id = new.clinic_user_id and status <> '有効';
  end if;
  return new;
end; $$;
