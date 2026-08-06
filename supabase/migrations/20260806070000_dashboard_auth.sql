-- Phase 14: dashboard auth + read-side RLS.
--
-- accounts.user_id — binds the merchant's Supabase Auth user to the account
--                    row so dashboard queries can scope by auth.uid().
--
-- RLS: the dashboard reads through the *authenticated* (anon) client, so these
-- policies let a merchant see exactly their own customers/payments/emails.
-- Service-role routes (webhooks, cron, recovery) bypass RLS entirely.

alter table public.accounts
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create unique index if not exists accounts_user_id_key
  on public.accounts (user_id) where user_id is not null;

alter table public.accounts enable row level security;
alter table public.customers enable row level security;
alter table public.failed_payments enable row level security;
alter table public.email_events enable row level security;

drop policy if exists accounts_owner_select on public.accounts;
create policy accounts_owner_select on public.accounts
  for select using (user_id = auth.uid());

-- resolveAccount needs to INSERT a fresh account bound to the caller...
drop policy if exists accounts_owner_insert on public.accounts;
create policy accounts_owner_insert on public.accounts
  for insert with check (user_id = auth.uid());

-- ...and UPDATE to claim the single unbound default account on first sign-in.
drop policy if exists accounts_owner_update on public.accounts;
create policy accounts_owner_update on public.accounts
  for update using (
    user_id = auth.uid() or user_id is null
  ) with check (user_id = auth.uid());

drop policy if exists customers_owner_select on public.customers;
create policy customers_owner_select on public.customers
  for select using (
    account_id in (select id from public.accounts where user_id = auth.uid())
  );

drop policy if exists failed_payments_owner_select on public.failed_payments;
create policy failed_payments_owner_select on public.failed_payments
  for select using (
    customer_id in (
      select c.id from public.customers c
      join public.accounts a on a.id = c.account_id
      where a.user_id = auth.uid()
    )
  );

drop policy if exists email_events_owner_select on public.email_events;
create policy email_events_owner_select on public.email_events
  for select using (
    failed_payment_id in (
      select fp.id from public.failed_payments fp
      join public.customers c on c.id = fp.customer_id
      join public.accounts a on a.id = c.account_id
      where a.user_id = auth.uid()
    )
  );
