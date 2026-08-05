-- Phase 4: RecoverKit core schema (Stripe dunning data model).
-- Reference: docs/TECHNICAL.md §7 (validated design).
--
-- RLS is enabled on every table with NO policies: only the service-role (secret)
-- key used by server-side API routes and the Stripe webhook handler can
-- read/write. Auth-scoped dashboard policies (account_id = auth.uid()) land in
-- Phase 14 alongside dashboard auth.
--
-- Design notes (Supabase Postgres Best Practices):
-- - uuid PKs via gen_random_uuid() so accounts.id stays compatible with
--   auth.uid() for Phase 14 RLS policies.
-- - money stored as bigint cents (Stripe amounts are int64; never overflows).
-- - text instead of varchar(n); enums modelled as text + CHECK constraints.
-- - every FK column is indexed (Postgres does not auto-index FKs).
-- - idempotent DDL (IF NOT EXISTS) so re-runs are safe.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  stripe_customer_id text not null unique,
  email text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_customers_account
  on public.customers (account_id);

create table if not exists public.failed_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  stripe_invoice_id text not null unique,
  stripe_subscription_id text,
  amount_due bigint not null, -- cents (Stripe int64)
  attempt_count integer not null default 1,
  decline_code text,
  status text not null default 'open',
  next_payment_attempt timestamptz,
  created_at timestamptz not null default now(),
  -- updated_at is app-managed (set via ON CONFLICT DO UPDATE ... updated_at = now());
  -- there is intentionally no DB trigger.
  updated_at timestamptz not null default now(),
  constraint failed_payments_status_check
    check (status in ('open', 'paid', 'void', 'uncollectible'))
);
create index if not exists idx_failed_payments_customer
  on public.failed_payments (customer_id);
create index if not exists idx_failed_payments_subscription
  on public.failed_payments (stripe_subscription_id);
-- Partial index on the dunning cron hot path (fetch open payments); a full
-- b-tree over the low-cardinality status column would rarely be used.
create index if not exists idx_failed_payments_open
  on public.failed_payments (status) where status = 'open';

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  failed_payment_id uuid not null references public.failed_payments (id) on delete cascade,
  resend_email_id text not null,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint email_events_event_type_check
    check (event_type in ('sent', 'delivered', 'opened', 'clicked', 'bounced'))
);
create index if not exists idx_email_events_payment
  on public.email_events (failed_payment_id);
create index if not exists idx_email_events_resend
  on public.email_events (resend_email_id); -- matched back by Resend webhooks

create table if not exists public.recovery_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  token_hash text not null unique, -- SHA-256 of the raw magic-link token
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_recovery_tokens_customer
  on public.recovery_tokens (customer_id);
-- token_hash needs no extra index: the unique constraint already provides one.

create table if not exists public.webhook_events ( -- idempotency ledger
  event_id text primary key, -- Stripe event id (evt_...)
  type text not null,
  processed_at timestamptz not null default now()
);

-- RLS: lock everything down until Phase 14 adds auth-scoped dashboard policies.
alter table public.accounts enable row level security;
alter table public.customers enable row level security;
alter table public.failed_payments enable row level security;
alter table public.email_events enable row level security;
alter table public.recovery_tokens enable row level security;
alter table public.webhook_events enable row level security;
