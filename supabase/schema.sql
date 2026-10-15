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
-- Copy responses from the tables the site used before forms could be edited. Each response keeps
-- its id, so running this again copies nothing twice. Once you have checked the admin page, the
-- old tables (help_requests, tag_pickups, dinner_applications, angel_tree_applications,
-- help_offers) can be deleted.
-- ---------------------------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.help_offers') is not null then
    insert into public.responses (id, form_slug, created_at, language, status, answers)
    select id, 'help', created_at, language,
      case status when 'contacted' then 'Contacted' else 'New' end,
      jsonb_build_object(
        'name', name,
        'email', coalesce(email, ''),
        'phone', coalesce(phone, ''),
        'help_with', coalesce((select jsonb_agg(case when v = 'other' then '__other' else v end) from unnest(help_with) v), '[]'::jsonb),
        'help_with__other', coalesce(other, '')
      )
    from public.help_offers
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.tag_pickups') is not null then
    insert into public.responses (id, form_slug, created_at, language, status, answers)
    select id, 'tags', created_at, 'en',
      case status when 'returned' then 'Gift returned' else 'Tag taken' end,
      jsonb_build_object(
        'tags', tag_numbers,
        'name', name,
        'phone', coalesce(phone, ''),
        'email', coalesce(email, ''),
        'notes', coalesce(notes, '')
      )
    from public.tag_pickups
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.help_requests') is not null then
    insert into public.responses (id, form_slug, created_at, language, status, answers)
    select id, 'request', created_at, 'en',
      case status when 'in_progress' then 'In progress' when 'fulfilled' then 'Done' else 'New' end,
      jsonb_build_object(
        'programs', to_jsonb(programs),
        'name', name,
        'phone', coalesce(phone, ''),
        'email', coalesce(email, ''),
        'address', coalesce(address, ''),
        'household', coalesce(household_size::text, ''),
        'details', coalesce(details, '')
      )
    from public.help_requests
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.dinner_applications') is not null then
    insert into public.responses (id, form_slug, created_at, language, status, answers)
    select id, holiday, created_at, language,
      case status when 'in_progress' then 'In progress' when 'fulfilled' then 'Done' else 'New' end,
      jsonb_build_object(
        'for_who', case when for_self then 'self' else 'other' end,
        'name', name,
        'phone', coalesce(phone, ''),
        'email', coalesce(email, ''),
        'pickup', case when pickup_by is null then 'me' else 'other' end,
        'pickup_name', coalesce(pickup_by, '')
      ) || case when for_self then
        jsonb_build_object('household', coalesce(household_size::text, ''), 'address', coalesce(address, ''))
      else
        jsonb_build_object(
          'recipient_name', coalesce(recipient_name, ''),
          'recipient_household', coalesce(household_size::text, ''),
          'recipient_address', coalesce(address, ''),
          'recipient_phone', coalesce(recipient_phone, ''),
          'recipient_email', coalesce(recipient_email, '')
        )
      end
    from public.dinner_applications
    on conflict (id) do nothing;
  end if;

  -- The old Angel Tree table had one row per child. Children sent together become one response.
  if to_regclass('public.angel_tree_applications') is not null then
    insert into public.responses (id, form_slug, created_at, language, status, answers)
    select family, 'angel_tree', min(created_at), (array_agg(language order by created_at))[1],
      case (array_agg(status order by created_at))[1]
        when 'in_progress' then 'In progress' when 'fulfilled' then 'Done' else 'New' end,
      (array_agg(shared order by created_at))[1] || jsonb_build_object('children', jsonb_agg(child order by created_at))
    from (
      select coalesce(family_id, id) as family, created_at, language, status,
        jsonb_build_object(
          'for_who', case when for_self then 'self' else 'other' end,
          'name', name,
          'phone', coalesce(phone, ''),
          'email', coalesce(email, ''),
          'pickup', case when pickup_by is null then 'me' else 'other' end,
          'pickup_name', coalesce(pickup_by, ''),
          'address', case when for_self then coalesce(address, '') else '' end,
          'parent_name', coalesce(parent_name, ''),
          'parent_phone', coalesce(parent_phone, ''),
          'parent_email', coalesce(parent_email, ''),
          'parent_address', case when for_self then '' else coalesce(address, '') end
        ) as shared,
        jsonb_build_object(
          'child_name', child_name,
          'age', age,
          'gender', coalesce(gender, ''),
          'shirt', coalesce(shirt_size, ''),
          'jeans', coalesce(jeans_size, ''),
          'shoe', coalesce(shoe_size, ''),
          'coat', coalesce(coat_size, ''),
          'bedding', case
            when bedding_size is null then ''
            when bedding_size in ('twin', 'full', 'queen', 'king') then bedding_size
            else '__other' end,
          'bedding__other', case
            when bedding_size is null or bedding_size in ('twin', 'full', 'queen', 'king') then ''
            else bedding_size end,
          'interests', coalesce(interests, ''),
          'color', coalesce(favorite_color, ''),
          'wishes', coalesce(wishes, '')
        ) as child
      from public.angel_tree_applications
    ) rows
    group by family
    on conflict (id) do nothing;
  end if;
end $$;
