-- Phase 3: waitlist signups.
-- RLS enabled with no policies: only the service-role key (server-side API route)
-- can read/write. The anon key has zero access.

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'landing',
  created_at timestamptz not null default now()
);

create index if not exists waitlist_signups_created_at_idx
  on public.waitlist_signups (created_at desc);

alter table public.waitlist_signups enable row level security;
