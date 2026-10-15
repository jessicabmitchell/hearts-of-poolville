-- Hearts of Poolville: run this once in the Supabase SQL editor.

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  programs text[] not null check (cardinality(programs) > 0),
  name text not null,
  phone text,
  email text,
  address text,
  household_size int,
  details text,
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'fulfilled'))
);

create table if not exists public.tag_pickups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  tag_numbers text not null,
  notes text,
  status text not null default 'picked'
    check (status in ('picked', 'returned'))
);

create table if not exists public.dinner_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  holiday text not null check (holiday in ('thanksgiving', 'christmas')),
  for_self boolean not null,          -- false = applying for another family
  name text not null,                 -- the person who filled out the form
  phone text,
  email text,
  pickup_by text,                     -- null = the person who filled out the form
  recipient_name text,                -- null when for_self
  recipient_phone text,
  recipient_email text,
  household_size int,
  address text,
  language text not null default 'en' check (language in ('en', 'es')),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'fulfilled'))
);

create table if not exists public.angel_tree_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  family_id uuid,                     -- children sent on the same form share this
  for_self boolean not null,          -- false = filling out for someone else's child
  name text not null,                 -- the person who filled out the form
  phone text,
  email text,
  pickup_by text,                     -- null = the person who filled out the form
  parent_name text,                   -- null when for_self
  parent_phone text,
  parent_email text,
  address text,
  child_name text not null,           -- first name or initials
  age text not null,
  gender text check (gender in ('male', 'female')),
  shirt_size text,
  jeans_size text,
  shoe_size text,
  coat_size text,
  bedding_size text,
  interests text,
  favorite_color text,
  wishes text,
  language text not null default 'en' check (language in ('en', 'es')),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'fulfilled'))
);

create table if not exists public.help_offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  help_with text[] not null check (cardinality(help_with) > 0),
  other text,
  language text not null default 'en' check (language in ('en', 'es')),
  status text not null default 'new'
    check (status in ('new', 'contacted'))
);

-- For a database set up before children were grouped by family.
alter table public.angel_tree_applications add column if not exists family_id uuid;

-- Row level security ON with no policies means the public (anon) key and signed-in
-- users can read and write nothing. Only the server, using the service role key,
-- touches these tables.
alter table public.help_requests enable row level security;
alter table public.tag_pickups enable row level security;
alter table public.dinner_applications enable row level security;
alter table public.angel_tree_applications enable row level security;
alter table public.help_offers enable row level security;

create index if not exists help_requests_created_idx on public.help_requests (created_at desc);
create index if not exists tag_pickups_created_idx on public.tag_pickups (created_at desc);
create index if not exists dinner_applications_created_idx on public.dinner_applications (created_at desc);
create index if not exists angel_tree_applications_created_idx on public.angel_tree_applications (created_at desc);
create index if not exists help_offers_created_idx on public.help_offers (created_at desc);
