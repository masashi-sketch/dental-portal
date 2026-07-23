-- ウェビナー Phase 1: BGJが開催情報と対象医院を管理し、外部参加URLを公開する。
-- Google Meet / ZoomのAPI認証・自動作成は後続PhaseでAdapter経由に追加する。

create table if not exists public.webinars (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'canceled')),
  organizer_email text not null,
  version integer not null default 1 check (version > 0),
  published_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webinar_sessions (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  provider text not null check (provider in ('google_meet', 'zoom')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Asia/Tokyo',
  join_url text not null check (join_url ~ '^https://'),
  external_space_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webinar_sessions_time_order check (ends_at > starts_at),
  constraint webinar_sessions_one_slot unique (webinar_id, starts_at)
);

create table if not exists public.webinar_target_clinics (
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  customer_code text not null references public.clinics(customer_code) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (webinar_id, customer_code)
);

create table if not exists public.webinar_events (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'updated', 'published', 'canceled')),
  actor_email text not null,
  from_status text check (from_status is null or from_status in ('draft', 'published', 'canceled')),
  to_status text not null check (to_status in ('draft', 'published', 'canceled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_webinars_status_updated on public.webinars(status, updated_at desc);
create index if not exists idx_webinar_sessions_starts on public.webinar_sessions(starts_at);
create index if not exists idx_webinar_target_clinics_customer on public.webinar_target_clinics(customer_code, webinar_id);
create index if not exists idx_webinar_events_webinar_created on public.webinar_events(webinar_id, created_at desc);

alter table public.webinars enable row level security;
alter table public.webinar_sessions enable row level security;
alter table public.webinar_target_clinics enable row level security;
alter table public.webinar_events enable row level security;

create or replace function public.save_webinar_draft(
  p_webinar_id uuid,
  p_expected_version integer,
  p_title text,
  p_description text,
  p_provider text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text,
  p_join_url text,
  p_customer_codes text[],
  p_actor_email text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_missing integer;
begin
  if nullif(trim(p_title), '') is null or char_length(trim(p_title)) > 200
     or p_provider not in ('google_meet', 'zoom')
     or p_ends_at <= p_starts_at
     or p_join_url !~ '^https://'
     or coalesce(array_length(p_customer_codes, 1), 0) = 0
     or nullif(trim(p_actor_email), '') is null then
    raise exception 'ウェビナー入力が不正です';
  end if;

  select count(*) into v_missing
  from unnest(p_customer_codes) code
  left join public.clinics c on c.customer_code = code
  where c.customer_code is null;
  if v_missing > 0 then raise exception '存在しない対象医院が含まれています'; end if;

  if p_webinar_id is null then
    insert into public.webinars (title, description, organizer_email)
    values (trim(p_title), nullif(trim(p_description), ''), p_actor_email)
    returning id into v_id;
    insert into public.webinar_events (webinar_id, event_type, actor_email, from_status, to_status)
    values (v_id, 'created', p_actor_email, null, 'draft');
  else
    update public.webinars
    set title = trim(p_title), description = nullif(trim(p_description), ''),
        version = version + 1, updated_at = now()
    where id = p_webinar_id and status = 'draft' and version = p_expected_version
    returning id into v_id;
    if v_id is null then raise exception '更新競合または下書き以外は編集できません'; end if;
    delete from public.webinar_sessions where webinar_id = v_id;
    delete from public.webinar_target_clinics where webinar_id = v_id;
    insert into public.webinar_events (webinar_id, event_type, actor_email, from_status, to_status)
    values (v_id, 'updated', p_actor_email, 'draft', 'draft');
  end if;

  insert into public.webinar_sessions
    (webinar_id, provider, starts_at, ends_at, timezone, join_url)
  values
    (v_id, p_provider, p_starts_at, p_ends_at, p_timezone, p_join_url);

  insert into public.webinar_target_clinics (webinar_id, customer_code)
  select v_id, code from (select distinct unnest(p_customer_codes) as code) selected;

  return v_id;
end;
$$;

create or replace function public.transition_webinar(
  p_webinar_id uuid,
  p_expected_version integer,
  p_to_status text,
  p_actor_email text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from text;
begin
  select status into v_from from public.webinars
  where id = p_webinar_id and version = p_expected_version for update;
  if v_from is null then raise exception '更新競合'; end if;
  if not ((v_from = 'draft' and p_to_status in ('published', 'canceled'))
      or (v_from = 'published' and p_to_status = 'canceled')) then
    raise exception '不正な状態遷移';
  end if;

  update public.webinars
  set status = p_to_status, version = version + 1, updated_at = now(),
      published_at = case when p_to_status = 'published' then now() else published_at end,
      canceled_at = case when p_to_status = 'canceled' then now() else canceled_at end
  where id = p_webinar_id;
  insert into public.webinar_events (webinar_id, event_type, actor_email, from_status, to_status)
  values (p_webinar_id, p_to_status, p_actor_email, v_from, p_to_status);
  return p_webinar_id;
end;
$$;

revoke all on public.webinars, public.webinar_sessions, public.webinar_target_clinics, public.webinar_events from anon, authenticated;
revoke execute on function public.save_webinar_draft(uuid, integer, text, text, text, timestamptz, timestamptz, text, text, text[], text) from public, anon, authenticated;
revoke execute on function public.transition_webinar(uuid, integer, text, text) from public, anon, authenticated;
grant all on public.webinars, public.webinar_sessions, public.webinar_target_clinics, public.webinar_events to service_role;
grant execute on function public.save_webinar_draft(uuid, integer, text, text, text, timestamptz, timestamptz, text, text, text[], text) to service_role;
grant execute on function public.transition_webinar(uuid, integer, text, text) to service_role;
