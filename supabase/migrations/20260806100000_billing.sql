-- Phase 23: RecoverKit's own billing (platform subscription, $29/mo).
-- This is separate from Stripe Connect: these columns describe the merchant's
-- subscription TO RecoverKit, not their own Stripe account.
--
-- Writes are owned by Stripe webhooks (service role). The dashboard reads
-- through the existing accounts RLS (user_id = auth.uid()).
--
-- Hardening: the Phase 14 accounts_owner_update policy lets the row owner
-- rewrite ANY column (it was written for resolveAccount's claim flow). That
-- would let a merchant set their own plan_status = 'active'. A BEFORE UPDATE
-- trigger guards the billing columns: for authenticated (anon-key) writes it
-- rejects changes to billing fields. Service-role writes (webhooks, cron)
-- have auth.uid() = null and bypass the guard — they remain the only writers.

alter table public.accounts
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_status text not null default 'free',
  add column if not exists plan_price_id text,
  add column if not exists current_period_end timestamptz;

alter table public.accounts
  drop constraint if exists accounts_plan_status_check;

alter table public.accounts
  add constraint accounts_plan_status_check
  check (plan_status in ('free', 'active', 'trialing', 'past_due', 'unpaid', 'canceled', 'paused'));

create or replace function public.guard_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for service-role (server) writes — those own billing.
  -- For authenticated client writes, billing fields are immutable.
  if auth.uid() is not null
    and (
      new.plan_status is distinct from old.plan_status
      or new.stripe_subscription_id is distinct from old.stripe_subscription_id
      or new.stripe_customer_id is distinct from old.stripe_customer_id
      or new.plan_price_id is distinct from old.plan_price_id
      or new.current_period_end is distinct from old.current_period_end
    )
  then
    raise exception 'billing fields are service-role only';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_billing_guard on public.accounts;
create trigger accounts_billing_guard
  before update on public.accounts
  for each row execute function public.guard_billing_columns();
