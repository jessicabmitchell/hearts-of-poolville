-- Hearts of Poolville: run this in the Supabase SQL editor. Running it again is safe.

-- Each form's questions, wording, and dates, as edited on the admin page.
create table if not exists public.forms (
  slug text primary key,
  config jsonb not null,
  updated_at timestamptz,
  updated_by text
);

-- The version a form had before each save, so a mistake can be undone.
create table if not exists public.form_versions (
  id bigint generated always as identity primary key,
  slug text not null,
  config jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by text
);

-- Everything people send through the forms.
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  form_slug text not null,
  created_at timestamptz not null default now(),
  language text not null default 'en' check (language in ('en', 'es')),
  status text not null,
  answers jsonb not null
);

-- Counts for the admin menu, without loading every response.
create or replace view public.response_counts with (security_invoker = true) as
  select form_slug, status, count(*) as total from public.responses group by form_slug, status;

-- Row level security ON with no policies means the public (anon) key and signed-in
-- users can read and write nothing. Only the server, using the service role key,
-- touches these tables.
alter table public.forms enable row level security;
alter table public.form_versions enable row level security;
alter table public.responses enable row level security;

create index if not exists responses_form_created_idx on public.responses (form_slug, created_at desc);
create index if not exists form_versions_slug_idx on public.form_versions (slug, id desc);

-- ---------------------------------------------------------------------------------------------
-- Holiday meals: kit contents, inventory, packing, and pickup. "event" is the form's slug
-- (thanksgiving or christmas), and each registration is one response to that form.
-- ---------------------------------------------------------------------------------------------

-- Kit sizes and what goes in each kit, as edited on the Meal plan page.
create table if not exists public.meal_plans (
  event text primary key,
  config jsonb not null,
  updated_at timestamptz,
  updated_by text
);

-- One row per registered family: pickup code, packing checklist, packing and pickup.
create table if not exists public.meal_kits (
  response_id uuid primary key references public.responses (id) on delete cascade,
  event text not null,
  number int not null,
  code text not null,
  checked jsonb not null default '[]'::jsonb,   -- item ids ticked so far while packing
  packed_at timestamptz,
  packed_by text,
  items jsonb,                                  -- quantities taken from inventory when packed
  picked_up_at timestamptz,
  picked_up_by text,
  pickup_override boolean not null default false,
  history jsonb not null default '[]'::jsonb,
  unique (event, number)
);

-- Every change to inventory, never edited, so two volunteers counting at once never overwrite
-- each other. What is on hand is the sum of the changes.
create table if not exists public.inventory_entries (
  id bigint generated always as identity primary key,
  event text not null,
  item_id text not null,
  change int not null,
  reason text not null check (reason in ('donation', 'correction', 'packed', 'unpacked')),
  response_id uuid,
  created_at timestamptz not null default now(),
  created_by text
);

create or replace view public.inventory_totals with (security_invoker = true) as
  select event, item_id, sum(change)::int as on_hand from public.inventory_entries group by event, item_id;

alter table public.meal_plans enable row level security;
alter table public.meal_kits enable row level security;
alter table public.inventory_entries enable row level security;

create index if not exists inventory_entries_event_idx on public.inventory_entries (event, id desc);
create index if not exists meal_kits_event_idx on public.meal_kits (event, number);

-- Give every registration that does not have one yet a pickup code (TG-001, TG-002, ...), in the
-- order they registered.
create or replace function public.assign_meal_codes(p_event text, p_prefix text)
returns void language plpgsql as $$
declare
  next_n int;
begin
  perform pg_advisory_xact_lock(hashtext('meal_codes:' || p_event));
  select coalesce(max(number), 0) into next_n from public.meal_kits where event = p_event;
  insert into public.meal_kits (response_id, event, number, code)
  select id, p_event, next_n + n, p_prefix || '-' || lpad((next_n + n)::text, 3, '0')
  from (
    select r.id, row_number() over (order by r.created_at, r.id) as n
    from public.responses r
    where r.form_slug = p_event
      and not exists (select 1 from public.meal_kits k where k.response_id = r.id)
  ) fresh;
end $$;

-- Mark a family's meal packed and take its items out of inventory, all at once. Returns 'ok', or
-- why it could not: 'missing' or 'already_packed'.
create or replace function public.pack_meal(p_response uuid, p_items jsonb, p_by text)
returns text language plpgsql as $$
declare
  k public.meal_kits;
begin
  select * into k from public.meal_kits where response_id = p_response for update;
  if not found then return 'missing'; end if;
  if k.packed_at is not null then return 'already_packed'; end if;
  update public.meal_kits
    set packed_at = now(), packed_by = p_by, items = p_items,
        history = history || jsonb_build_object('action', 'packed', 'by', p_by, 'at', now())
    where response_id = p_response;
  insert into public.inventory_entries (event, item_id, change, reason, response_id, created_by)
    select k.event, key, -(value::int), 'packed', p_response, p_by
    from jsonb_each_text(p_items) where value::int <> 0;
  return 'ok';
end $$;

-- Reopen a packed meal and put its items back in inventory. Returns 'ok', 'missing',
-- 'not_packed', or 'picked_up'.
create or replace function public.unpack_meal(p_response uuid, p_by text)
returns text language plpgsql as $$
declare
  k public.meal_kits;
begin
  select * into k from public.meal_kits where response_id = p_response for update;
  if not found then return 'missing'; end if;
  if k.packed_at is null then return 'not_packed'; end if;
  if k.picked_up_at is not null then return 'picked_up'; end if;
  insert into public.inventory_entries (event, item_id, change, reason, response_id, created_by)
    select k.event, key, value::int, 'unpacked', p_response, p_by
    from jsonb_each_text(coalesce(k.items, '{}'::jsonb)) where value::int <> 0;
  update public.meal_kits
    set packed_at = null, packed_by = null, items = null,
        history = history || jsonb_build_object('action', 'reopened', 'by', p_by, 'at', now())
    where response_id = p_response;
  return 'ok';
end $$;

-- Mark a meal picked up, or undo that. An unpacked meal is refused unless p_override is true.
-- Returns 'ok', 'missing', 'not_packed', 'already', or 'not_picked_up'.
create or replace function public.set_pickup(p_response uuid, p_by text, p_override boolean, p_undo boolean)
returns text language plpgsql as $$
declare
  k public.meal_kits;
begin
  select * into k from public.meal_kits where response_id = p_response for update;
  if not found then return 'missing'; end if;
  if p_undo then
    if k.picked_up_at is null then return 'not_picked_up'; end if;
    update public.meal_kits
      set picked_up_at = null, picked_up_by = null, pickup_override = false,
          history = history || jsonb_build_object('action', 'pickup undone', 'by', p_by, 'at', now())
      where response_id = p_response;
    return 'ok';
  end if;
  if k.picked_up_at is not null then return 'already'; end if;
  if k.packed_at is null and not p_override then return 'not_packed'; end if;
  update public.meal_kits
    set picked_up_at = now(), picked_up_by = p_by, pickup_override = (k.packed_at is null),
        history = history || jsonb_build_object(
          'action', case when k.packed_at is null then 'picked up before packing' else 'picked up' end,
          'by', p_by, 'at', now())
    where response_id = p_response;
  return 'ok';
end $$;

-- Only the website's server (service role) may run these.
revoke all on function public.assign_meal_codes(text, text) from public, anon, authenticated;
revoke all on function public.pack_meal(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.unpack_meal(uuid, text) from public, anon, authenticated;
revoke all on function public.set_pickup(uuid, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.assign_meal_codes(text, text) to service_role;
grant execute on function public.pack_meal(uuid, jsonb, text) to service_role;
grant execute on function public.unpack_meal(uuid, text) to service_role;
grant execute on function public.set_pickup(uuid, text, boolean, boolean) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Food donations: drop-off times and what donors promise to bring.
-- ---------------------------------------------------------------------------------------------

-- Drop-off times, in Poolville time.
create table if not exists public.dropoff_slots (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  day date not null,
  start_time text not null,                    -- 'HH:MM'
  end_time text not null,                      -- 'HH:MM'
  place text not null default '',
  capacity int,                                -- most donors for this time, or null for no limit
  created_at timestamptz not null default now()
);

-- One row per donor sign-up.
create table if not exists public.pledges (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  number int not null,
  code text not null,
  slot_id uuid references public.dropoff_slots (id) on delete restrict,
  name text not null,
  phone text,
  email text,
  items jsonb not null default '{}'::jsonb,     -- item id -> how many they promised
  other text,
  language text not null default 'en' check (language in ('en', 'es')),
  status text not null default 'promised' check (status in ('promised', 'received', 'cancelled')),
  received jsonb,                               -- item id -> how many they actually brought
  received_at timestamptz,
  received_by text,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (event, number)
);

alter table public.inventory_entries add column if not exists pledge_id uuid;

alter table public.dropoff_slots enable row level security;
alter table public.pledges enable row level security;

create index if not exists dropoff_slots_event_idx on public.dropoff_slots (event, day, start_time);
create index if not exists pledges_event_idx on public.pledges (event, number);

-- Save a donor's promise, checking under a lock that the time is still open and has room, and
-- that nobody has promised the same items first. p_slot may be null for a promise a volunteer
-- recorded without a drop-off time. p_available is what is still needed per item before any
-- promises; p_now is the current Poolville time as 'YYYY-MM-DD HH:MM'.
-- Returns {"code": "DN-001"} or {"error": "slot" | "full" | "too_many", ...}.
create or replace function public.add_pledge(
  p_event text, p_prefix text, p_slot uuid, p_name text, p_phone text, p_email text,
  p_items jsonb, p_other text, p_lang text, p_available jsonb, p_now text
)
returns jsonb language plpgsql as $$
declare
  s public.dropoff_slots;
  taken int;
  k text;
  v int;
  used int;
  left_over int;
  n int;
begin
  perform pg_advisory_xact_lock(hashtext('pledges:' || p_event));
  if p_slot is not null then
    select * into s from public.dropoff_slots where id = p_slot and event = p_event;
    if not found or (s.day::text || ' ' || s.end_time) <= p_now then
      return jsonb_build_object('error', 'slot');
    end if;
    if s.capacity is not null then
      select count(*) into taken from public.pledges where slot_id = s.id and status <> 'cancelled';
      if taken >= s.capacity then return jsonb_build_object('error', 'full'); end if;
    end if;
  end if;
  for k, v in select key, value::int from jsonb_each_text(p_items) loop
    continue when v <= 0;
    select coalesce(sum((p.items ->> k)::int), 0) into used
      from public.pledges p left join public.dropoff_slots d on d.id = p.slot_id
      where p.event = p_event and p.status = 'promised'
        and (p.slot_id is null or (d.day::text || ' ' || d.end_time) > p_now);
    left_over := coalesce((p_available ->> k)::int, 0) - used;
    if v > left_over then
      return jsonb_build_object('error', 'too_many', 'item', k, 'left', greatest(left_over, 0));
    end if;
  end loop;
  select coalesce(max(number), 0) + 1 into n from public.pledges where event = p_event;
  insert into public.pledges (event, number, code, slot_id, name, phone, email, items, other, language)
    values (p_event, n, p_prefix || '-' || lpad(n::text, 3, '0'), p_slot, p_name, nullif(p_phone, ''),
            nullif(p_email, ''), p_items, nullif(p_other, ''), p_lang);
  return jsonb_build_object('code', p_prefix || '-' || lpad(n::text, 3, '0'));
end $$;

-- Check a donor in and add what they brought to inventory. Returns 'ok', 'missing', 'already',
-- or 'cancelled'.
create or replace function public.receive_pledge(p_id uuid, p_received jsonb, p_by text)
returns text language plpgsql as $$
declare
  p public.pledges;
begin
  select * into p from public.pledges where id = p_id for update;
  if not found then return 'missing'; end if;
  if p.status = 'received' then return 'already'; end if;
  if p.status = 'cancelled' then return 'cancelled'; end if;
  update public.pledges
    set status = 'received', received = p_received, received_at = now(), received_by = p_by,
        history = history || jsonb_build_object('action', 'received', 'by', p_by, 'at', now())
    where id = p_id;
  insert into public.inventory_entries (event, item_id, change, reason, pledge_id, created_by)
    select p.event, key, value::int, 'donation', p_id, p_by
    from jsonb_each_text(p_received) where value::int > 0;
  return 'ok';
end $$;

-- Undo a check-in and take those items back out of inventory. Returns 'ok', 'missing', or
-- 'not_received'.
create or replace function public.undo_receive(p_id uuid, p_by text)
returns text language plpgsql as $$
declare
  p public.pledges;
begin
  select * into p from public.pledges where id = p_id for update;
  if not found then return 'missing'; end if;
  if p.status <> 'received' then return 'not_received'; end if;
  insert into public.inventory_entries (event, item_id, change, reason, pledge_id, created_by)
    select p.event, key, -(value::int), 'correction', p_id, p_by
    from jsonb_each_text(coalesce(p.received, '{}'::jsonb)) where value::int > 0;
  update public.pledges
    set status = 'promised', received = null, received_at = null, received_by = null,
        history = history || jsonb_build_object('action', 'check-in undone', 'by', p_by, 'at', now())
    where id = p_id;
  return 'ok';
end $$;

revoke all on function public.add_pledge(text, text, uuid, text, text, text, jsonb, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.receive_pledge(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.undo_receive(uuid, text) from public, anon, authenticated;
grant execute on function public.add_pledge(text, text, uuid, text, text, text, jsonb, text, text, jsonb, text) to service_role;
grant execute on function public.receive_pledge(uuid, jsonb, text) to service_role;
grant execute on function public.undo_receive(uuid, text) to service_role;

-- The one-time copy of responses from the site's original tables (help_requests, tag_pickups,
-- dinner_applications, angel_tree_applications, help_offers) was removed after it ran, so running
-- this file again cannot bring back a response you deleted. It is in the git history (commit
-- 25545e7) if it is ever needed.

-- ---------------------------------------------------------------------------------------------
-- Angel Tree: an ID for every child (A1, A2, ...) and which tag form took their tag.
-- ---------------------------------------------------------------------------------------------

-- One row per child on an Angel Tree sign-up. "idx" is the child's place on the family's form,
-- from 0. Answers are never edited after they are sent, so it always points at the same child.
create table if not exists public.angels (
  response_id uuid not null references public.responses (id) on delete cascade,
  idx int not null,
  number int not null unique,
  code text not null unique,
  tag_response_id uuid references public.responses (id) on delete set null,  -- the tag form that took it
  tagged_at timestamptz,
  tagged_by text,                                                              -- 'tag form' or the admin's email
  primary key (response_id, idx)
);

alter table public.angels enable row level security;
create index if not exists angels_tag_idx on public.angels (tag_response_id);

-- Give every child who does not have one yet an ID, in the order they signed up. IDs are never
-- reused, so a printed tag always means the same child even if a sign-up is deleted.
create or replace function public.assign_angel_codes(p_slug text, p_section text, p_prefix text)
returns void language plpgsql as $$
declare
  next_n int;
begin
  perform pg_advisory_xact_lock(hashtext('angel_codes'));
  select coalesce(max(number), 0) into next_n from public.angels;
  insert into public.angels (response_id, idx, number, code)
  select id, idx, next_n + n, p_prefix || (next_n + n)::text
  from (
    select r.id, (e.ord - 1)::int as idx, row_number() over (order by r.created_at, r.id, e.ord) as n
    from public.responses r
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(r.answers -> p_section) = 'array' then r.answers -> p_section else '[]'::jsonb end
    ) with ordinality as e(child, ord)
    where r.form_slug = p_slug
      and not exists (select 1 from public.angels a where a.response_id = r.id and a.idx = (e.ord - 1)::int)
  ) fresh;
end $$;

-- IDs were first made as A-001; they are now A1, which is easier to type.
update public.angels set code = 'A' || number where code like 'A-%';

revoke all on function public.assign_angel_codes(text, text, text) from public, anon, authenticated;
grant execute on function public.assign_angel_codes(text, text, text) to service_role;
