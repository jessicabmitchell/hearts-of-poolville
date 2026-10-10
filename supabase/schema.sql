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

-- Row level security ON with no policies means the public (anon) key and signed-in
-- users can read and write nothing. Only the server, using the service role key,
-- touches these tables.
alter table public.help_requests enable row level security;
alter table public.tag_pickups enable row level security;

create index if not exists help_requests_created_idx on public.help_requests (created_at desc);
create index if not exists tag_pickups_created_idx on public.tag_pickups (created_at desc);
