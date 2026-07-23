-- 医院ごとの業務連絡担当者。医院代表情報・認証アカウント・患者向けスタッフ紹介とは分離する。

create table if not exists public.clinic_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null references public.clinics(customer_code) on delete restrict,
  clinic_user_id uuid references public.clinic_users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  department text,
  title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  version integer not null default 1 check (version > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_contacts_active_primary check (not is_primary or (status = 'active' and deleted_at is null)),
  constraint clinic_contacts_email_format check (email is null or (char_length(email) <= 254 and position('@' in email) > 1)),
  constraint clinic_contacts_contact_method check (email is not null or phone is not null)
);

create table if not exists public.clinic_contact_notification_preferences (
  contact_id uuid not null references public.clinic_contacts(id) on delete restrict,
  topic text not null check (topic in ('webinar', 'orders', 'billing', 'product', 'system', 'sales')),
  channel text not null check (channel in ('email', 'phone')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (contact_id, topic, channel)
);

create table if not exists public.clinic_contact_events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.clinic_contacts(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'updated', 'deactivated', 'reactivated', 'primary_changed', 'deleted')),
  actor_type text not null check (actor_type in ('bgj', 'clinic', 'system')),
  actor_identifier text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists clinic_contacts_one_primary
  on public.clinic_contacts(customer_code)
  where is_primary and status = 'active' and deleted_at is null;
create unique index if not exists clinic_contacts_email_per_clinic
  on public.clinic_contacts(customer_code, lower(email))
  where email is not null and deleted_at is null;
create unique index if not exists clinic_contacts_clinic_user
  on public.clinic_contacts(clinic_user_id)
  where clinic_user_id is not null and deleted_at is null;
create index if not exists idx_clinic_contacts_customer
  on public.clinic_contacts(customer_code, status, is_primary desc) where deleted_at is null;
create index if not exists idx_clinic_contact_events_contact
  on public.clinic_contact_events(contact_id, created_at desc);

drop trigger if exists trg_clinic_contacts_updated_at on public.clinic_contacts;
create trigger trg_clinic_contacts_updated_at before update on public.clinic_contacts
  for each row execute function public.set_updated_at_generic();
drop trigger if exists trg_clinic_contact_preferences_updated_at on public.clinic_contact_notification_preferences;
create trigger trg_clinic_contact_preferences_updated_at before update on public.clinic_contact_notification_preferences
  for each row execute function public.set_updated_at_generic();

alter table public.clinic_contacts enable row level security;
alter table public.clinic_contact_notification_preferences enable row level security;
alter table public.clinic_contact_events enable row level security;

create or replace function public.save_clinic_contact(
  p_contact_id uuid,
  p_expected_version integer,
  p_customer_code text,
  p_clinic_user_id uuid,
  p_name text,
  p_department text,
  p_title text,
  p_email text,
  p_phone text,
  p_is_primary boolean,
  p_status text,
  p_notes text,
  p_email_topics text[],
  p_phone_topics text[],
  p_actor_type text,
  p_actor_identifier text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_previous_status text;
  v_event_type text;
begin
  if nullif(trim(p_name), '') is null or char_length(trim(p_name)) > 100
    or (nullif(trim(p_email), '') is null and nullif(trim(p_phone), '') is null)
    or p_status not in ('active', 'inactive')
    or p_actor_type not in ('bgj', 'clinic', 'system')
    or nullif(trim(p_actor_identifier), '') is null then
    raise exception '担当者入力が不正です';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_email_topics, '{}'::text[]) || coalesce(p_phone_topics, '{}'::text[])) topic
    where topic not in ('webinar', 'orders', 'billing', 'product', 'system', 'sales')
  ) then raise exception '通知種別が不正です'; end if;
  if nullif(trim(p_email), '') is null and coalesce(array_length(p_email_topics, 1), 0) > 0 then
    raise exception 'メール通知にはメールアドレスが必要です';
  end if;
  if nullif(trim(p_phone), '') is null and coalesce(array_length(p_phone_topics, 1), 0) > 0 then
    raise exception '電話連絡には電話番号が必要です';
  end if;
  if p_clinic_user_id is not null and not exists (
    select 1 from public.clinic_users where id = p_clinic_user_id and customer_code = p_customer_code
  ) then raise exception '医院ログインが一致しません'; end if;

  if p_is_primary and p_status = 'active' then
    insert into public.clinic_contact_events(contact_id, event_type, actor_type, actor_identifier)
    select id, 'primary_changed', p_actor_type, p_actor_identifier
    from public.clinic_contacts
    where customer_code = p_customer_code and id is distinct from p_contact_id
      and is_primary and status = 'active' and deleted_at is null;
    update public.clinic_contacts set is_primary = false, version = version + 1
    where customer_code = p_customer_code and id is distinct from p_contact_id
      and is_primary and status = 'active' and deleted_at is null;
  end if;

  if p_contact_id is null then
    insert into public.clinic_contacts(
      customer_code, clinic_user_id, name, department, title, email, phone,
      is_primary, status, notes
    ) values (
      p_customer_code, p_clinic_user_id, trim(p_name), nullif(trim(p_department), ''),
      nullif(trim(p_title), ''), lower(nullif(trim(p_email), '')), nullif(trim(p_phone), ''),
      p_is_primary and p_status = 'active', p_status, nullif(trim(p_notes), '')
    ) returning id into v_id;
    v_event_type := 'created';
  else
    select status into v_previous_status from public.clinic_contacts
    where id = p_contact_id and customer_code = p_customer_code and deleted_at is null;
    update public.clinic_contacts set
      clinic_user_id = p_clinic_user_id, name = trim(p_name), department = nullif(trim(p_department), ''),
      title = nullif(trim(p_title), ''), email = lower(nullif(trim(p_email), '')),
      phone = nullif(trim(p_phone), ''), is_primary = p_is_primary and p_status = 'active',
      status = p_status, notes = nullif(trim(p_notes), ''), version = version + 1
    where id = p_contact_id and customer_code = p_customer_code and deleted_at is null
      and version = p_expected_version returning id into v_id;
    if v_id is null then raise exception '更新競合'; end if;
    v_event_type := case
      when v_previous_status = 'active' and p_status = 'inactive' then 'deactivated'
      when v_previous_status = 'inactive' and p_status = 'active' then 'reactivated'
      else 'updated' end;
    delete from public.clinic_contact_notification_preferences where contact_id = v_id;
  end if;

  insert into public.clinic_contact_notification_preferences(contact_id, topic, channel)
  select v_id, topic, 'email' from (select distinct unnest(coalesce(p_email_topics, '{}'::text[])) topic) topics;
  insert into public.clinic_contact_notification_preferences(contact_id, topic, channel)
  select v_id, topic, 'phone' from (select distinct unnest(coalesce(p_phone_topics, '{}'::text[])) topic) topics;
  insert into public.clinic_contact_events(contact_id, event_type, actor_type, actor_identifier)
  values (v_id, v_event_type, p_actor_type, p_actor_identifier);
  return v_id;
end; $$;

create or replace function public.delete_clinic_contact(
  p_contact_id uuid, p_expected_version integer, p_customer_code text,
  p_actor_type text, p_actor_identifier text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update public.clinic_contacts set deleted_at = now(), status = 'inactive', is_primary = false, version = version + 1
  where id = p_contact_id and customer_code = p_customer_code and deleted_at is null
    and version = p_expected_version returning id into v_id;
  if v_id is null then raise exception '更新競合'; end if;
  update public.clinic_contact_notification_preferences set enabled = false where contact_id = v_id;
  insert into public.clinic_contact_events(contact_id, event_type, actor_type, actor_identifier)
  values (v_id, 'deleted', p_actor_type, p_actor_identifier);
  return v_id;
end; $$;

create or replace function public.get_webinar_notification_recipients(p_customer_codes text[])
returns table(email text)
language sql stable security definer set search_path = public as $$
  with configured as (
    select distinct c.customer_code, lower(c.email) as email
    from public.clinic_contacts c
    join public.clinic_contact_notification_preferences p on p.contact_id = c.id
    where c.customer_code = any(p_customer_codes) and c.status = 'active' and c.deleted_at is null
      and c.email is not null and p.topic = 'webinar' and p.channel = 'email' and p.enabled
  ), fallback as (
    select u.customer_code, lower(u.email) as email
    from public.clinic_users u
    where u.customer_code = any(p_customer_codes) and u.status = '有効' and u.email is not null
      and not exists (select 1 from configured c where c.customer_code = u.customer_code)
  )
  select distinct recipients.email from (select * from configured union all select * from fallback) recipients;
$$;

revoke all on public.clinic_contacts, public.clinic_contact_notification_preferences, public.clinic_contact_events from anon, authenticated;
revoke execute on function public.save_clinic_contact(uuid, integer, text, uuid, text, text, text, text, text, boolean, text, text, text[], text[], text, text) from public, anon, authenticated;
revoke execute on function public.delete_clinic_contact(uuid, integer, text, text, text) from public, anon, authenticated;
revoke execute on function public.get_webinar_notification_recipients(text[]) from public, anon, authenticated;
grant all on public.clinic_contacts, public.clinic_contact_notification_preferences, public.clinic_contact_events to service_role;
grant execute on function public.save_clinic_contact(uuid, integer, text, uuid, text, text, text, text, text, boolean, text, text, text[], text[], text, text) to service_role;
grant execute on function public.delete_clinic_contact(uuid, integer, text, text, text) to service_role;
grant execute on function public.get_webinar_notification_recipients(text[]) to service_role;
