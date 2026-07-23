-- 医院スタッフ管理 Phase 1: 担当者を正本プロフィールとして、認証・権限・セッションを分離管理する。

alter table public.clinic_users add column if not exists session_version integer not null default 1 check (session_version > 0);
alter table public.clinic_users add column if not exists last_login_at timestamptz;
alter table public.clinic_users add column if not exists password_changed_at timestamptz;

create table if not exists public.clinic_portal_roles (
  role_key text primary key check (role_key in ('admin', 'staff', 'viewer')),
  label text not null unique,
  description text not null,
  sort_order integer not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_portal_role_permissions (
  role_key text not null references public.clinic_portal_roles(role_key) on delete restrict,
  permission_key text not null check (permission_key in ('view_contacts', 'manage_contacts', 'manage_logins')),
  created_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

create table if not exists public.clinic_user_role_assignments (
  clinic_user_id uuid primary key references public.clinic_users(id) on delete cascade,
  role_key text not null references public.clinic_portal_roles(role_key) on delete restrict,
  assigned_by text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.clinic_portal_roles(role_key, label, description, sort_order) values
  ('admin', '管理者', '担当者・ログイン・権限を管理できます。', 10),
  ('staff', '一般', '医院の日常業務を行います。担当者管理は閲覧のみです。', 20),
  ('viewer', '閲覧専用', '担当者情報を含む医院ポータルを閲覧します。', 30)
on conflict (role_key) do update set label = excluded.label, description = excluded.description, sort_order = excluded.sort_order;

insert into public.clinic_portal_role_permissions(role_key, permission_key) values
  ('admin', 'view_contacts'), ('admin', 'manage_contacts'), ('admin', 'manage_logins'),
  ('staff', 'view_contacts'), ('viewer', 'view_contacts')
on conflict do nothing;

-- 既存医院ログインは従来と同じ操作を継続できるよう管理者で移行する。
insert into public.clinic_user_role_assignments(clinic_user_id, role_key, assigned_by)
select id, 'admin', 'phase1-backfill' from public.clinic_users
on conflict (clinic_user_id) do nothing;

drop trigger if exists trg_clinic_portal_roles_updated_at on public.clinic_portal_roles;
create trigger trg_clinic_portal_roles_updated_at before update on public.clinic_portal_roles
  for each row execute function public.set_updated_at_generic();
drop trigger if exists trg_clinic_user_role_assignments_updated_at on public.clinic_user_role_assignments;
create trigger trg_clinic_user_role_assignments_updated_at before update on public.clinic_user_role_assignments
  for each row execute function public.set_updated_at_generic();

alter table public.clinic_contact_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.clinic_contact_events drop constraint if exists clinic_contact_events_event_type_check;
alter table public.clinic_contact_events add constraint clinic_contact_events_event_type_check check (
  event_type in ('created', 'updated', 'deactivated', 'reactivated', 'primary_changed', 'deleted',
    'login_created', 'login_updated', 'login_disabled', 'role_changed')
);

create or replace function public.sync_clinic_contact_login_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text; v_active_admins integer;
begin
  if new.clinic_user_id is not null
    and (new.deleted_at is not null or new.status = 'inactive')
    and (old.deleted_at is null and old.status = 'active') then
    select role_key into v_role from public.clinic_user_role_assignments where clinic_user_id = new.clinic_user_id;
    if v_role = 'admin' then
      select count(*) into v_active_admins
      from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id = u.id
      where u.customer_code = new.customer_code and u.status = '有効' and r.role_key = 'admin';
      if v_active_admins <= 1 then raise exception '最後の管理者は無効化できません'; end if;
    end if;
    update public.clinic_users set status = '無効', session_version = session_version + 1
    where id = new.clinic_user_id and status <> '無効';
  end if;
  return new;
end; $$;

drop trigger if exists trg_clinic_contact_login_status on public.clinic_contacts;
create trigger trg_clinic_contact_login_status before update on public.clinic_contacts
  for each row execute function public.sync_clinic_contact_login_status();

create or replace function public.save_clinic_contact_login(
  p_contact_id uuid,
  p_customer_code text,
  p_login_id text,
  p_password_hash text,
  p_email text,
  p_status text,
  p_role_key text,
  p_actor_type text,
  p_actor_identifier text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_contact_name text;
  v_current_role text;
  v_current_status text;
  v_active_admins integer;
  v_role_key text := p_role_key;
  v_event_type text;
begin
  if nullif(trim(p_login_id), '') is null or char_length(trim(p_login_id)) not between 3 and 100 or trim(p_login_id) ~ '[[:space:]]'
    or p_status not in ('有効', '無効') or p_role_key not in ('admin', 'staff', 'viewer')
    or p_actor_type not in ('bgj', 'clinic', 'system') then raise exception 'ログイン入力が不正です'; end if;

  select name, clinic_user_id into v_contact_name, v_user_id
  from public.clinic_contacts where id = p_contact_id and customer_code = p_customer_code
    and deleted_at is null for update;
  if v_contact_name is null then raise exception '担当者が見つかりません'; end if;

  if v_user_id is null then
    if nullif(p_password_hash, '') is null then raise exception '初期パスワードが必要です'; end if;
    -- 利用可能な管理者がいない医院では、最初の有効なログインを必ず管理者にする。
    if p_status = '有効' and not exists (
      select 1 from public.clinic_users u
      join public.clinic_user_role_assignments r on r.clinic_user_id = u.id
      where u.customer_code = p_customer_code and u.status = '有効' and r.role_key = 'admin'
    ) then v_role_key := 'admin'; end if;
    insert into public.clinic_users(customer_code, login_id, password_hash, name, email, status, password_changed_at)
    values (p_customer_code, trim(p_login_id), p_password_hash, v_contact_name,
      lower(nullif(trim(p_email), '')), p_status, now()) returning id into v_user_id;
    update public.clinic_contacts set clinic_user_id = v_user_id, version = version + 1 where id = p_contact_id;
    insert into public.clinic_user_role_assignments(clinic_user_id, role_key, assigned_by)
    values (v_user_id, v_role_key, p_actor_identifier);
    v_event_type := 'login_created';
  else
    select u.status, r.role_key into v_current_status, v_current_role
    from public.clinic_users u left join public.clinic_user_role_assignments r on r.clinic_user_id = u.id
    where u.id = v_user_id and u.customer_code = p_customer_code for update of u;
    if p_status = '有効' and v_role_key <> 'admin' and not exists (
      select 1 from public.clinic_users u
      join public.clinic_user_role_assignments r on r.clinic_user_id = u.id
      where u.customer_code = p_customer_code and u.status = '有効' and r.role_key = 'admin'
        and u.id <> v_user_id
    ) then v_role_key := 'admin'; end if;
    if v_current_role = 'admin' and (v_role_key <> 'admin' or p_status = '無効') then
      select count(*) into v_active_admins
      from public.clinic_users u join public.clinic_user_role_assignments r on r.clinic_user_id = u.id
      where u.customer_code = p_customer_code and u.status = '有効' and r.role_key = 'admin';
      if v_active_admins <= 1 then raise exception '最後の管理者は変更・無効化できません'; end if;
    end if;
    update public.clinic_users set login_id = trim(p_login_id), name = v_contact_name,
      email = lower(nullif(trim(p_email), '')), status = p_status,
      password_hash = coalesce(nullif(p_password_hash, ''), password_hash),
      password_changed_at = case when nullif(p_password_hash, '') is not null then now() else password_changed_at end,
      session_version = session_version + case when p_status is distinct from v_current_status or nullif(p_password_hash, '') is not null then 1 else 0 end
    where id = v_user_id;
    insert into public.clinic_user_role_assignments(clinic_user_id, role_key, assigned_by)
    values (v_user_id, v_role_key, p_actor_identifier)
    on conflict (clinic_user_id) do update set role_key = excluded.role_key, assigned_by = excluded.assigned_by;
    v_event_type := case when p_status = '無効' and v_current_status = '有効' then 'login_disabled'
      when v_current_role is distinct from v_role_key then 'role_changed' else 'login_updated' end;
  end if;
  insert into public.clinic_contact_events(contact_id, event_type, actor_type, actor_identifier, metadata)
  values (p_contact_id, v_event_type, p_actor_type, p_actor_identifier,
    jsonb_build_object('clinic_user_id', v_user_id, 'role_key', v_role_key, 'status', p_status));
  return v_user_id;
end; $$;

drop function if exists public.get_clinic_session_state(uuid);
create function public.get_clinic_session_state(p_clinic_user_id uuid)
returns table(status text, session_version integer, role_key text, permissions text[])
language sql stable security definer set search_path = public as $$
  select u.status, u.session_version, coalesce(r.role_key, 'admin'),
    array(select p.permission_key from public.clinic_portal_role_permissions p
      where p.role_key = coalesce(r.role_key, 'admin') order by p.permission_key)
  from public.clinic_users u
  left join public.clinic_user_role_assignments r on r.clinic_user_id = u.id
  where u.id = p_clinic_user_id;
$$;

create or replace function public.set_clinic_user_password(p_clinic_user_id uuid, p_password_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if nullif(p_password_hash, '') is null then raise exception 'パスワードが必要です'; end if;
  update public.clinic_users set password_hash = p_password_hash, password_changed_at = now(),
    session_version = session_version + 1, failed_login_attempts = 0, locked_until = null
  where id = p_clinic_user_id returning id into v_id;
  if v_id is null then raise exception '医院ログインが見つかりません'; end if;
  return v_id;
end; $$;

alter table public.clinic_portal_roles enable row level security;
alter table public.clinic_portal_role_permissions enable row level security;
alter table public.clinic_user_role_assignments enable row level security;
revoke all on public.clinic_portal_roles, public.clinic_portal_role_permissions, public.clinic_user_role_assignments from anon, authenticated;
revoke execute on function public.save_clinic_contact_login(uuid, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.set_clinic_user_password(uuid, text) from public, anon, authenticated;
revoke execute on function public.get_clinic_session_state(uuid) from public, anon, authenticated;
grant all on public.clinic_portal_roles, public.clinic_portal_role_permissions, public.clinic_user_role_assignments to service_role;
grant execute on function public.save_clinic_contact_login(uuid, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.set_clinic_user_password(uuid, text) to service_role;
grant execute on function public.get_clinic_session_state(uuid) to service_role;
