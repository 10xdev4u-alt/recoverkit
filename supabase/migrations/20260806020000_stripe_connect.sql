-- Phase 5: Stripe Connect (platform OAuth) fields on accounts.
-- Tokens live server-side only (service-role reads/writes; RLS already on).
-- NOTE: plaintext at rest today — encryption lands in Phase 19 hardening.

alter table public.accounts
  add column if not exists stripe_account_id text unique,
  add column if not exists stripe_access_token text,
  add column if not exists stripe_refresh_token text,
  add column if not exists stripe_account_email text,
  add column if not exists connected_at timestamptz;
