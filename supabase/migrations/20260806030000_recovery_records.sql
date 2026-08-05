-- Phase 7: recovery record engine.
--
-- failed_payments.last_event_created — epoch seconds of the newest Stripe event
--   that wrote this row. Lets the engine refuse stale/out-of-order deliveries
--   (TECHNICAL.md §4: never downgrade state on a stale event).
--
-- upsert_failed_payment(...) — single atomic upsert keyed on stripe_invoice_id.
--   - never lowers attempt_count / amount_due (greatest),
--   - refuses any event older than the last one already applied,
--   - preserves next_payment_attempt unless the caller explicitly sets it
--     (charge.failed doesn't know Stripe's retry schedule, invoice events do).

alter table public.failed_payments
  add column if not exists last_event_created bigint;

create or replace function public.upsert_failed_payment(
  p_customer_id uuid,
  p_stripe_invoice_id text,
  p_stripe_subscription_id text,
  p_amount_due bigint,
  p_attempt_count integer,
  p_decline_code text,
  p_status text,
  p_next_payment_attempt timestamptz,
  p_set_next_attempt boolean,
  p_event_created bigint
) returns public.failed_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.failed_payments;
begin
  insert into public.failed_payments (
    customer_id, stripe_invoice_id, stripe_subscription_id, amount_due,
    attempt_count, decline_code, status, next_payment_attempt,
    last_event_created, updated_at
  ) values (
    p_customer_id, p_stripe_invoice_id, p_stripe_subscription_id, p_amount_due,
    p_attempt_count, p_decline_code, p_status,
    case when p_set_next_attempt then p_next_payment_attempt end,
    p_event_created, now()
  )
  on conflict (stripe_invoice_id) do update set
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, failed_payments.stripe_subscription_id),
    amount_due = greatest(failed_payments.amount_due, excluded.amount_due),
    attempt_count = greatest(failed_payments.attempt_count, excluded.attempt_count),
    decline_code = coalesce(excluded.decline_code, failed_payments.decline_code),
    status = excluded.status,
    next_payment_attempt = case
      when p_set_next_attempt then excluded.next_payment_attempt
      else failed_payments.next_payment_attempt
    end,
    last_event_created = excluded.last_event_created,
    updated_at = now()
  where p_event_created >= coalesce(failed_payments.last_event_created, 0)
  returning * into rec;

  return rec;
end;
$$;

-- Security definer runs as the function owner (bypasses RLS) — only the
-- service-role may call it. Postgres grants EXECUTE to PUBLIC by default.
revoke execute on function public.upsert_failed_payment(
  p_customer_id uuid, p_stripe_invoice_id text, p_stripe_subscription_id text,
  p_amount_due bigint, p_attempt_count integer, p_decline_code text,
  p_status text, p_next_payment_attempt timestamptz,
  p_set_next_attempt boolean, p_event_created bigint
) from public, anon, authenticated;

grant execute on function public.upsert_failed_payment(
  p_customer_id uuid, p_stripe_invoice_id text, p_stripe_subscription_id text,
  p_amount_due bigint, p_attempt_count integer, p_decline_code text,
  p_status text, p_next_payment_attempt timestamptz,
  p_set_next_attempt boolean, p_event_created bigint
) to service_role;
