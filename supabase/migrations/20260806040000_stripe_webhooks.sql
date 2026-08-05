-- Phase 6: webhook idempotency ledger + per-account endpoint secrets.
--
-- webhook_events.created  — Stripe event.created (epoch seconds) so out-of-order
--                           deliveries can be compared (never downgrade state on a
--                           stale event).
-- accounts.stripe_webhook_secret — whsec_... for the webhook endpoint we create on
--                           each connected account at connect time (Phase 6).
-- Both columns are additive and idempotent.

alter table public.webhook_events
  add column if not exists created bigint;

alter table public.accounts
  add column if not exists stripe_webhook_secret text;
