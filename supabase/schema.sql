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

-- The one-time copy of responses from the site's original tables (help_requests, tag_pickups,
-- dinner_applications, angel_tree_applications, help_offers) was removed after it ran, so running
-- this file again cannot bring back a response you deleted. It is in the git history (commit
-- 25545e7) if it is ever needed.
