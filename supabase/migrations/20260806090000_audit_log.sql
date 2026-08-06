-- Phase 19: audit log. Every sensitive mutation (settings changes, Stripe
-- connect, template overrides, cron send failures, webhook dispatch failures)
-- appends an immutable row. Service-role writes only; RLS keeps it locked.

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  actor_type text not null default 'system'
    check (actor_type in ('user', 'system', 'stripe', 'resend')),
  actor_id text,
  action text not null,
  entity_type text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_account_created_idx
  on public.audit_events (account_id, created_at desc);
create index if not exists audit_events_action_idx
  on public.audit_events (action);

-- Locked: no public policies — service role (cron, webhooks, connect) writes,
-- and reads stay internal until a dashboard "activity" view ships.
alter table public.audit_events enable row level security;
