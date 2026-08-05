-- Phase 8: retry scheduler.
--
-- failed_payments.last_scheduled_at — set when the hourly cron has planned
-- actions for a record. Guards against double-firing across cron runs
-- (the run locks by setting this, idempotent by construction).

alter table public.failed_payments
  add column if not exists last_scheduled_at timestamptz;
