-- Google Meet自動発行で得た外部予定IDと、ウェビナーごとの個別メール送付先を保持する。

create table if not exists public.webinar_target_contacts (
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  contact_id uuid not null references public.clinic_contacts(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (webinar_id, contact_id)
);

create index if not exists idx_webinar_target_contacts_contact
  on public.webinar_target_contacts(contact_id, webinar_id);

alter table public.webinar_target_contacts enable row level security;

drop function if exists public.save_webinar_draft(
  uuid, integer, text, text, text, timestamptz, timestamptz, text, text, text[], text
);

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
  p_external_space_id text,
  p_customer_codes text[],
  p_contact_ids uuid[],
  p_actor_email text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_missing integer;
  v_customer_count integer;
  v_recipient_customer_count integer;
begin
  if nullif(trim(p_title), '') is null or char_length(trim(p_title)) > 200
     or p_provider not in ('google_meet', 'zoom')
     or p_ends_at <= p_starts_at
     or p_join_url !~ '^https://'
     or coalesce(array_length(p_customer_codes, 1), 0) = 0
     or coalesce(array_length(p_contact_ids, 1), 0) = 0
     or nullif(trim(p_actor_email), '') is null then
    raise exception 'ウェビナー入力が不正です';
  end if;

  select count(*) into v_missing
  from (select distinct unnest(p_customer_codes) as code) selected
  left join public.clinics c on c.customer_code = selected.code
  where c.customer_code is null;
  if v_missing > 0 then raise exception '存在しない対象医院が含まれています'; end if;

  select count(*) into v_missing
  from (select distinct unnest(p_contact_ids) as id) selected
  left join public.clinic_contacts c on c.id = selected.id
  where c.id is null or c.status <> 'active' or c.deleted_at is not null
    or c.email is null or not (c.customer_code = any(p_customer_codes));
  if v_missing > 0 then raise exception '選択できない担当者が含まれています'; end if;

  select count(distinct code) into v_customer_count from unnest(p_customer_codes) as selected(code);
  select count(distinct c.customer_code) into v_recipient_customer_count
  from public.clinic_contacts c where c.id = any(p_contact_ids);
  if v_customer_count <> v_recipient_customer_count then
    raise exception '対象医院ごとにメール送付先を1名以上選択してください';
  end if;

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
    delete from public.webinar_target_contacts where webinar_id = v_id;
    delete from public.webinar_target_clinics where webinar_id = v_id;
    insert into public.webinar_events (webinar_id, event_type, actor_email, from_status, to_status)
    values (v_id, 'updated', p_actor_email, 'draft', 'draft');
  end if;

  insert into public.webinar_sessions
    (webinar_id, provider, starts_at, ends_at, timezone, join_url, external_space_id)
  values
    (v_id, p_provider, p_starts_at, p_ends_at, p_timezone, p_join_url,
     nullif(trim(p_external_space_id), ''));

  insert into public.webinar_target_clinics (webinar_id, customer_code)
  select v_id, code from (select distinct unnest(p_customer_codes) as code) selected;

  insert into public.webinar_target_contacts (webinar_id, contact_id)
  select v_id, id from (select distinct unnest(p_contact_ids) as id) selected;

  return v_id;
end;
$$;

create or replace function public.get_webinar_selected_recipients(p_webinar_id uuid)
returns table(contact_id uuid, contact_name text, email text)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, lower(c.email)
  from public.webinar_target_contacts target
  join public.clinic_contacts c on c.id = target.contact_id
  where target.webinar_id = p_webinar_id
    and c.status = 'active' and c.deleted_at is null and c.email is not null
  order by c.customer_code, c.name, c.id;
$$;

create or replace function public.transition_webinar(
  p_webinar_id uuid,
  p_expected_version integer,
  p_to_status text,
  p_actor_email text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_from text;
begin
  select status into v_from from public.webinars
  where id = p_webinar_id and version = p_expected_version for update;
  if v_from is null then raise exception '更新競合'; end if;
  if not ((v_from = 'draft' and p_to_status in ('published', 'canceled'))
      or (v_from = 'published' and p_to_status = 'canceled')) then
    raise exception '不正な状態遷移';
  end if;
  if p_to_status = 'published' and (
    exists (
      select 1 from public.webinar_target_contacts target
      left join public.clinic_contacts c on c.id = target.contact_id
      where target.webinar_id = p_webinar_id
        and (c.id is null or c.status <> 'active' or c.deleted_at is not null or c.email is null)
    ) or exists (
      select 1 from public.webinar_target_clinics clinic_target
      where clinic_target.webinar_id = p_webinar_id and not exists (
        select 1 from public.webinar_target_contacts contact_target
        join public.clinic_contacts c on c.id = contact_target.contact_id
        where contact_target.webinar_id = clinic_target.webinar_id
          and c.customer_code = clinic_target.customer_code
          and c.status = 'active' and c.deleted_at is null and c.email is not null
      )
    )
  ) then raise exception '送付先担当者が無効です。下書きを編集して選択し直してください'; end if;
  update public.webinars set status = p_to_status, version = version + 1, updated_at = now(),
    published_at = case when p_to_status = 'published' then now() else published_at end,
    canceled_at = case when p_to_status = 'canceled' then now() else canceled_at end
  where id = p_webinar_id;
  insert into public.webinar_events(webinar_id,event_type,actor_email,from_status,to_status)
    values(p_webinar_id,p_to_status,p_actor_email,v_from,p_to_status);
  return p_webinar_id;
end; $$;

revoke all on public.webinar_target_contacts from anon, authenticated;
revoke execute on function public.save_webinar_draft(
  uuid, integer, text, text, text, timestamptz, timestamptz, text, text, text, text[], uuid[], text
) from public, anon, authenticated;
revoke execute on function public.get_webinar_selected_recipients(uuid) from public, anon, authenticated;
revoke execute on function public.transition_webinar(uuid, integer, text, text) from public, anon, authenticated;
grant all on public.webinar_target_contacts to service_role;
grant execute on function public.save_webinar_draft(
  uuid, integer, text, text, text, timestamptz, timestamptz, text, text, text, text[], uuid[], text
) to service_role;
grant execute on function public.get_webinar_selected_recipients(uuid) to service_role;
grant execute on function public.transition_webinar(uuid, integer, text, text) to service_role;
